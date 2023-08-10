#!/bin/bash

source .hpcgui_config

if which pbcopy >/dev/null 2>/dev/null; then
    echo -n "http://localhost:8000" | pbcopy
fi

uvicorn main:app --port 8000 --reload
