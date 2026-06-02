package main

import "testing"

func TestRemovePhotoTagFromContent(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    string
		changed bool
	}{
		{
			name:    "trailing mixed tags",
			content: "body\n\n#restaurant/cleis #photo",
			want:    "body\n\n#restaurant/cleis",
			changed: true,
		},
		{
			name:    "trailing photo only",
			content: "body\n\n#photo",
			want:    "body",
			changed: true,
		},
		{
			name:    "leading mixed tags",
			content: "#photo #real/\u65e5\u672c\nbody",
			want:    "#real/\u65e5\u672c\nbody",
			changed: true,
		},
		{
			name:    "leading and trailing photo",
			content: "#photo #real/\u65e5\u672c\nbody\n\n#restaurant/cleis #photo",
			want:    "#real/\u65e5\u672c\nbody\n\n#restaurant/cleis",
			changed: true,
		},
		{
			name:    "inline prose unchanged",
			content: "\u672c\u6587\u306e #photo \u306f\u6b8b\u3059",
			want:    "\u672c\u6587\u306e #photo \u306f\u6b8b\u3059",
			changed: false,
		},
		{
			name:    "similar tags unchanged",
			content: "body\n\n#photography #photo/album #photo\u65e5\u672c",
			want:    "body\n\n#photography #photo/album #photo\u65e5\u672c",
			changed: false,
		},
		{
			name:    "slash and japanese tags preserved",
			content: "body\n\n#restaurant/\u65e5\u672c #game/FF14 #photo",
			want:    "body\n\n#restaurant/\u65e5\u672c #game/FF14",
			changed: true,
		},
		{
			name:    "bare photo token on boundary line",
			content: "body\n\n#game photo",
			want:    "body\n\n#game",
			changed: true,
		},
		{
			name:    "case sensitive",
			content: "body\n\n#Photo #PHOTO #photo",
			want:    "body\n\n#Photo #PHOTO",
			changed: true,
		},
		{
			name:    "crlf preserved",
			content: "body\r\n\r\n#game #photo",
			want:    "body\r\n\r\n#game",
			changed: true,
		},
		{
			name:    "crlf trailing photo only",
			content: "body\r\n\r\n#photo",
			want:    "body",
			changed: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := removePhotoTagFromContent(tt.content)
			if got.Content != tt.want {
				t.Fatalf("content mismatch\nwant: %q\n got: %q", tt.want, got.Content)
			}
			if got.Changed != tt.changed {
				t.Fatalf("changed=%v want %v", got.Changed, tt.changed)
			}
		})
	}
}
