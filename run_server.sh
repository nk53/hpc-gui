#!/bin/bash

source .hpcgui_config

if which pbcopy >/dev/null 2>/dev/null; then
    url="http://localhost:8000"
    #echo -n "$url" | pbcopy
    #(sleep 2 ; open "$url") &
fi

uvicorn main:app --port 8000 --reload
