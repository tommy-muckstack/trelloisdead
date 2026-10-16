// Keyboard shortcuts list (plain module so server pages like /help can import it).
export const SHORTCUTS: [string, string][] = [
  ["?", "Show this list of shortcuts"], ["/", "Search"], ["B", "Open the boards menu (search boards)"], ["F", "Open the card filter"], ["X", "Clear all filters"], ["Q", "Toggle “cards assigned to me”"], ["W", "Show or hide the board menu"],
  ["←  →  ↑  ↓  /  J  K", "Select a card on the board"], ["Enter", "Open the selected card"], ["N", "Add a card below the hovered card"], ["E", "Open the hovered card (quick edit)"], ["T", "Edit the title of the hovered card"],
  ["Space", "Join or leave the hovered card"], ["1 – 9", "Toggle labels on the hovered card"], ["C", "Archive the hovered card"], ["S", "Watch or stop watching the hovered card"], ["V", "Vote on the hovered card (Voting Power-Up)"],
  [", (<)  . (>)", "Move the hovered card to the previous / next list"], ["R", "Repeat your last label, member or move action on the hovered card"], ["Z", "Undo"], ["Shift+Z", "Redo"], ["Esc", "Close a dialog, popover or editor"], ["Ctrl/⌘ + Enter", "Save a comment or description"],
];
