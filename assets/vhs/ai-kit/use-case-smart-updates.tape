Hide
Type "export PATH=/tmp/ai-kit/bin:$PATH && cd /tmp/ai-kit/smart-updates && clear"
Enter
Show

Sleep 500ms

Type "# First sync installs project config"
Enter

Sleep 1s

Type "ai-kit sync"
Enter

Sleep 4s

Type "# Edit a rule file — simulate local customization"
Enter

Sleep 500ms

Hide
Type "echo '# local tweak' >> .agents/rules/plan-mode.md"
Enter
Show

Sleep 1s

Type "# Second sync detects conflict, preserves our change"
Enter

Sleep 500ms

Type "ai-kit sync"
Enter

Sleep 4s

Type "# Our edit is still there"
Enter

Sleep 500ms

Type "tail -1 .agents/rules/plan-mode.md"
Enter

Sleep 2s
