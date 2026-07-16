# LinkedIn demo — FakeData Pro dry-run
# Generated for social media post
#
# Usage: vhs assets/vhs/linkedin-pro-dry-run.tape -o assets/vhs/fakedata/pro-dry-run.gif

Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 22
Set Width 1300
Set Height 650
Set Padding 10
Set TypingSpeed 40ms
Set Theme {"name":"Vetrina Light","black":"#5c5f77","red":"#d20f39","green":"#40a02b","yellow":"#df8e1d","blue":"#1e66f5","magenta":"#ea76cb","cyan":"#179299","white":"#acb0be","brightBlack":"#6c6f85","brightRed":"#d20f39","brightGreen":"#40a02b","brightYellow":"#df8e1d","brightBlue":"#1e66f5","brightMagenta":"#ea76cb","brightCyan":"#179299","brightWhite":"#bcc0cc","background":"#f4f4f5","foreground":"#1a1a1a","cursor":"#1a1a1a","cursorAccent":"#f4f4f5","selection":"#acb0be"}
Set Framerate 30

Set WindowBar Colorful

Sleep 1s

Type "# No surprises with dry-run"
Enter

Sleep 1s

Type "fakedata --dsn sqlite:pro.db -t users:5 -t products:5 --dry-run"
Enter

Sleep 2s

Type "# ✨ Confidence before insertion ✨"
Enter

Sleep 1s
