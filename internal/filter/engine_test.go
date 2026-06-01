package filter

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCompileAcceptsStandardTagEqualityPredicate(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	_, err = engine.Compile(context.Background(), `tags.exists(t, t == "1231")`)
	require.NoError(t, err)
}

func TestCompileRejectsLegacyNumericLogicalOperand(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	_, err = engine.Compile(context.Background(), `pinned && 1`)
	require.Error(t, err)
	require.Contains(t, err.Error(), "failed to compile filter")
}

func TestCompileRejectsNonBooleanTopLevelConstant(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	_, err = engine.Compile(context.Background(), `1`)
	require.EqualError(t, err, "filter must evaluate to a boolean value")
}

func TestCompileRendersHasImageAttachmentPredicate(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	stmt, err := engine.CompileToStatement(context.Background(), `has_image_attachment`, RenderOptions{Dialect: DialectSQLite})
	require.NoError(t, err)
	require.Empty(t, stmt.Args)
	require.Contains(t, stmt.SQL, "EXISTS (SELECT 1 FROM `attachment`")
	require.Contains(t, stmt.SQL, "`attachment`.`memo_id` = `memo`.`id`")
	require.Contains(t, stmt.SQL, "'image/jpeg'")
}

func TestCompileRendersHasImageAttachmentComparison(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	stmt, err := engine.CompileToStatement(context.Background(), `has_image_attachment == false`, RenderOptions{Dialect: DialectPostgres})
	require.NoError(t, err)
	require.Empty(t, stmt.Args)
	require.Contains(t, stmt.SQL, "NOT (EXISTS (SELECT 1 FROM attachment")
	require.Contains(t, stmt.SQL, "attachment.memo_id = memo.id")
}
