Tools deep dive: the experiment harness
=======================================

The setup behind "How coding agents work, deep dive: Tools". It answers one
question: with everything else held constant, what does the shape of the tool
surface cost?

This directory is excluded in website/.eleventyignore. The site collects every
markdown file under src/writing/ as a post, and this README plus the fixture
documentation would otherwise ship as articles.


What it runs
------------

Two fixtures, each with a trap.

fixtures/rename/       Rename DB_HOST to DATABASE_HOST across a compose file,
                       Terraform, a .env and some docs. The repository also
                       contains DB_HOST_OLD, which must survive. The trap
                       punishes regex overreach.

fixtures/references/   A Go module where GetUserByID exists as a method on two
                       different types, one of them unrelated. The task is to
                       name the callers of users.Store.GetUserByID. The trap
                       punishes text search, which cannot tell the two apart.

Each fixture is copied to runs/<label>/ before a run, so the original stays clean
and the outcome is checked on the copy.


The three surfaces
------------------

modes/one-tool.json      every tool but the shell disabled in the registry.
                         The model sees exactly one generic command.

modes/all-declared.json  the deferred-preload budget raised until the whole
                         catalogue is declared upfront: 28 schemas instead of
                         the 14 the harness ships with.

modes/on-demand.json     the declaration allowlist left empty, so only the
                         search bridge is declared and everything else waits
                         behind it.

The three mode files also carry the same provider block (DeepSeek) and disable
the background memory extractor, which would otherwise add requests that have
nothing to do with the tool surface.


Running it
----------

    npm install @qwen-code/qwen-code
    export DEEPSEEK_API_KEY=...
    export PATH="$PWD/node_modules/.bin:$PATH"

    ./run.sh rename      one-tool     rename-one-tool \
      "Rename the configuration key DB_HOST to DATABASE_HOST everywhere it appears in this repository. Leave every other key untouched."

    ./run.sh references  all-declared references-all-declared \
      "Which functions in this repository call the GetUserByID method on users.Store? List each call site with its file name and the enclosing function."

    python3 extract.py rename-one-tool references-all-declared

run.sh writes runs/<label>.jsonl (the stream-json transcript) and
runs/<label>-logs/ (the outgoing request payloads, via --openai-logging). The
request payload is the honest measure of the tool surface: the model's own
description of its tools is not reliable, and the session's registry listing
includes tools that were never declared.

The language server configuration is behind an experimental flag. Add
--experimental-lsp as a trailing argument to run.sh, and have the server on PATH:

    ./run.sh references all-declared references-all-declared-lsp "..." 40 --experimental-lsp


What is committed
-----------------

The fixtures, the mode configs, the runner and the extractor. The raw
transcripts are not committed: 4MB of JSON for seven runs, reproducible in a few
minutes. results/results.json and results/summary.tsv hold the numbers the
article quotes, including the outcome checks.


Reading the numbers
-------------------

Input tokens count the whole conversation on every turn, and 92 to 98 percent of
them were cache reads in these runs, so the totals overstate what was billed. The
cached column is the honest denominator, and the wall clock column is dominated
by provider latency: each cell ran once, so read the timings as illustration and
the token counts as the result.
