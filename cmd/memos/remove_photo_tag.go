package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/internal/version"
	"github.com/usememos/memos/store"
	"github.com/usememos/memos/store/db"
)

var removePhotoTagCmd = &cobra.Command{
	Use:   "remove-photo-tag",
	Short: "Remove legacy #photo from memo boundary tag lines",
	Long: `Removes only the legacy photo tag from boundary tag-only lines in memo content.

Boundary tag lines are the first non-empty line and the last non-empty line
when they consist only of tag tokens. Inline prose containing #photo is left
unchanged.

Default behavior is dry-run. Pass --execute to update memo content.`,
	RunE: runRemovePhotoTag,
}

func init() {
	removePhotoTagCmd.Flags().Bool("execute", false, "update memo content (default: dry-run)")
	removePhotoTagCmd.Flags().Int("limit", 0, "stop after changing this many memos (0 = no limit)")
	removePhotoTagCmd.Flags().String("uid", "", "process only the memo with this UID")
	removePhotoTagCmd.Flags().Bool("verbose", false, "print before/after content for changed memos")
}

type removePhotoTagOptions struct {
	dryRun    bool
	limit     int
	filterUID string
	verbose   bool
}

type removePhotoTagStats struct {
	scanned   int
	changed   int
	unchanged int
	written   int
	failed    int
}

type removePhotoTagResult struct {
	Content string
	Changed bool
}

func runRemovePhotoTag(cmd *cobra.Command, _ []string) error {
	execute, _ := cmd.Flags().GetBool("execute")
	limit, _ := cmd.Flags().GetInt("limit")
	filterUID, _ := cmd.Flags().GetString("uid")
	verbose, _ := cmd.Flags().GetBool("verbose")

	if !execute {
		fmt.Fprintln(os.Stderr, "remove-photo-tag dry-run (pass --execute to update memo content)")
	} else {
		fmt.Fprintln(os.Stderr, "remove-photo-tag execute mode")
	}

	instanceProfile := &profile.Profile{
		Data:   viper.GetString("data"),
		Driver: viper.GetString("driver"),
		DSN:    viper.GetString("dsn"),
	}
	instanceProfile.Version = version.GetCurrentVersion()
	instanceProfile.Commit = version.Commit

	if err := instanceProfile.Validate(); err != nil {
		return errors.Wrap(err, "invalid profile")
	}

	ctx := context.Background()
	dbDriver, err := db.NewDBDriver(instanceProfile)
	if err != nil {
		return errors.Wrap(err, "failed to create db driver")
	}
	storeInstance := store.New(dbDriver, instanceProfile)
	// Intentionally not calling Migrate: this command is an explicit content cleanup only.

	opts := removePhotoTagOptions{
		dryRun:    !execute,
		limit:     limit,
		filterUID: strings.TrimSpace(filterUID),
		verbose:   verbose,
	}
	stats, failedUIDs, err := removePhotoTagsFromMemos(ctx, storeInstance, opts)
	if err != nil {
		return err
	}

	if opts.dryRun {
		fmt.Printf("remove-photo-tag dry-run\nscanned=%d changed=%d unchanged=%d failed=%d\n",
			stats.scanned, stats.changed, stats.unchanged, stats.failed)
	} else {
		fmt.Printf("remove-photo-tag execute\nscanned=%d changed=%d written=%d unchanged=%d failed=%d\n",
			stats.scanned, stats.changed, stats.written, stats.unchanged, stats.failed)
	}
	if len(failedUIDs) > 0 {
		fmt.Println("failed UIDs:")
		for _, s := range failedUIDs {
			fmt.Println("  ", s)
		}
	}

	return nil
}

func removePhotoTagsFromMemos(ctx context.Context, st *store.Store, opts removePhotoTagOptions) (removePhotoTagStats, []string, error) {
	var stats removePhotoTagStats
	var failedUIDs []string
	changed := 0

	pageSize := 200
	offset := 0

	for {
		ps := pageSize
		find := &store.FindMemo{
			Limit:  &ps,
			Offset: &offset,
		}
		if opts.filterUID != "" {
			find.UID = &opts.filterUID
		}

		memos, err := st.ListMemos(ctx, find)
		if err != nil {
			return stats, failedUIDs, errors.Wrap(err, "failed to list memos")
		}
		if len(memos) == 0 {
			break
		}
		offset += len(memos)

		for _, memo := range memos {
			stats.scanned++
			result := removePhotoTagFromContent(memo.Content)
			if !result.Changed {
				stats.unchanged++
				continue
			}

			stats.changed++
			changed++
			fmt.Printf("  %s changed\n", memo.UID)
			if opts.verbose {
				fmt.Printf("    before:\n%s\n", indentBlock(memo.Content, "      "))
				fmt.Printf("    after:\n%s\n", indentBlock(result.Content, "      "))
			}

			if !opts.dryRun {
				nextContent := result.Content
				if err := st.UpdateMemo(ctx, &store.UpdateMemo{ID: memo.ID, Content: &nextContent}); err != nil {
					stats.failed++
					failedUIDs = append(failedUIDs, memo.UID+": "+err.Error())
					continue
				}
				stats.written++
			}

			if opts.limit > 0 && changed >= opts.limit {
				fmt.Fprintf(os.Stderr, "reached --limit %d, stopping\n", opts.limit)
				return stats, failedUIDs, nil
			}
		}

		if opts.filterUID != "" || len(memos) < pageSize {
			break
		}
	}

	return stats, failedUIDs, nil
}

func removePhotoTagFromContent(content string) removePhotoTagResult {
	lineBreak := "\n"
	normalized := content
	if strings.Contains(content, "\r\n") {
		lineBreak = "\r\n"
		normalized = strings.ReplaceAll(content, "\r\n", "\n")
	}

	lines := strings.Split(normalized, "\n")
	first := firstNonEmptyLine(lines)
	last := lastNonEmptyLine(lines)
	if first == -1 {
		return removePhotoTagResult{Content: content}
	}

	changed := false
	firstRemoved := false
	if next, ok := removePhotoFromBoundaryTagLine(lines[first]); ok {
		if next == "" {
			lines[first] = ""
			firstRemoved = true
		} else {
			lines[first] = next
		}
		changed = true
	}

	if last != first {
		if next, ok := removePhotoFromBoundaryTagLine(lines[last]); ok {
			if next == "" {
				lines[last] = ""
			} else {
				lines[last] = next
			}
			changed = true
		}
	}

	if !changed {
		return removePhotoTagResult{Content: content}
	}

	lines = trimEmptyBoundaryLines(lines, firstRemoved)
	return removePhotoTagResult{Content: strings.Join(lines, lineBreak), Changed: true}
}

func removePhotoFromBoundaryTagLine(line string) (string, bool) {
	tokens := strings.Fields(strings.TrimSpace(line))
	if len(tokens) == 0 {
		return line, false
	}

	kept := make([]string, 0, len(tokens))
	removed := false
	for _, token := range tokens {
		if token == "#photo" || token == "photo" {
			removed = true
			continue
		}
		if !strings.HasPrefix(token, "#") || len(token) == 1 {
			return line, false
		}
		kept = append(kept, token)
	}

	if !removed {
		return line, false
	}
	return strings.Join(kept, " "), true
}

func firstNonEmptyLine(lines []string) int {
	for i, line := range lines {
		if strings.TrimSpace(line) != "" {
			return i
		}
	}
	return -1
}

func lastNonEmptyLine(lines []string) int {
	for i := len(lines) - 1; i >= 0; i-- {
		if strings.TrimSpace(lines[i]) != "" {
			return i
		}
	}
	return -1
}

func trimEmptyBoundaryLines(lines []string, trimLeading bool) []string {
	if trimLeading {
		for len(lines) > 0 && strings.TrimSpace(lines[0]) == "" {
			lines = lines[1:]
		}
	}
	for len(lines) > 0 && strings.TrimSpace(lines[len(lines)-1]) == "" {
		lines = lines[:len(lines)-1]
	}
	if len(lines) == 0 {
		return []string{""}
	}
	return lines
}

func indentBlock(s, prefix string) string {
	if s == "" {
		return prefix
	}
	return prefix + strings.ReplaceAll(s, "\n", "\n"+prefix)
}
