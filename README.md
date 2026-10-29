# X Feed Blocker

Chrome extension that hides the X (Twitter) home feed while leaving the useful parts alone.

**Blocked:** home timeline (For you / Following), Explore trends, everything in the sidebar except search and Today's News, "Discover more" recommendations under a post.
**Still works:** composing posts (inline on /home or /compose/post), notifications, messages, individual posts and their replies, profiles, search, bookmarks, lists.

Each piece can be toggled from the toolbar popup.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Reload any open x.com tabs

## Notes

X changes its markup often. Selectors rely on `data-testid` attributes (`primaryColumn`, `sidebarColumn`, `cellInnerDiv`) and ARIA roles, which tend to be stable. If something leaks through, the CSS is in `content.css`.
