#!/bin/bash
#
# Will check for API keys in what is about to be committed.
# Called by "git commit" with no arguments.  The hook should
# exit with non-zero status after issuing an appropriate message if
# it wants to stop the commit.
#
# Use --no-verify to ignore

## Installation

# **Globally (all repos):**
#   - Create global git directory:
#     `mkdir $HOME/.git-hooks`
#   - Configure a global git hooks path:
#     `git config --global core.hooksPath $HOME/.git-hooks`
#   - Install api-key-hook file:
#     `cp pre-commit.sh $HOME/.git-hooks/pre-commit`

# **Locally (local repo):**
#   - Create pre-commit.sh to local repo
#     `cp pre-commit.sh .git/hooks/pre-commit`

STASH_NAME="pre-commit-$(date +%Y-%m-%d-%H-%M-%S)"
git stash push --quiet --keep-index --message "${STASH_NAME}"

# Test prospective commit
GDAX_KEY="\b[a-f0-9]{32}\b"
GDAX_SECRET="\b[a-zA-Z0-9=\/+]{88}\b"
POLONIEX_KEY="\b(([A-Z0-9]{8}\-){3})([A-Z0-9]{8})\b"
POLONIEX_SECRET="\b[a-f0-9]{128}\b"
BITTREX_KEY="\b[a-f0-9]{32}\b"
BITTREX_SECRET="\b[a-f0-9]{32}\b"

# De-dup regexs.
FORBIDDEN_EXP=($GDAX_KEY $GDAX_SECRET $POLONIEX_KEY $POLONIEX_SECRET $BITTREX_KEY $BITTREX_SECRET)
FORBIDDEN_EXP=($(echo "${FORBIDDEN_EXP[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))

FAIL_MESSAGE=$'
COMMIT REJECTED Found possible secret keys. Please remove them before
committing or use --no-verify to ignore and commit anyway.

If this has helped you, consider donating Bitcoin to:

  183J9CYci5Xbe3YXct1BHyRjyxH89QiUCc

I had BTC stolen :( just trying to earn it back ;)'

exitcode=0
for expression in "${FORBIDDEN_EXP[@]}"; do
    output=$(ls -p | grep  -v '.lock\|package.json' | GREP_COLOR='4;5;37;41' xargs grep --color=always --directories=skip --with-filename -n -iE "${expression}")
    if [[ $? -eq 0 ]]; then
        echo "${output}"
        echo "${FAIL_MESSAGE}"
        exitcode=1
    fi
done

if git stash list | head -1 | grep "${STASH_NAME}" >/dev/null; then
    git stash pop -q
fi

exit "${exitcode}"
