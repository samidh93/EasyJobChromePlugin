# EasyJob
EasyJob is a solution for people looking for job.

# For Developers

## Node modules
npm install esbuild --save-dev

## generate Bundle
npm run build

## How to test
go to chrome extensions chrome://extensions/ and load unpacked.
navigate to this repo and load it.

## Using Ollama
run this command to allow the chrome extension to connect to local hosted ollama:
OLLAMA_ORIGINS="chrome-extension://*" ollama serve

or configure this in ollama per default: (stop any running ollama process)
Create a file `~/.ollama/config.json` with the following content:
{
  "host": "0.0.0.0",
  "port": 11434,
  "origins": [
    "chrome-extension://*"
  ]
}
and then run ollama.