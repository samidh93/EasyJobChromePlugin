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

For permanent Change:

### macOS
Add to your shell configuration file (~/.zshrc for Zsh or ~/.bash_profile for Bash):
```bash
export OLLAMA_ORIGINS="chrome-extension://*"
```

### Linux
Add to your shell configuration file (~/.bashrc for Bash or ~/.zshrc for Zsh):
```bash
export OLLAMA_ORIGINS="chrome-extension://*"
```

### Windows
1. Open System Properties (Win + R, type sysdm.cpl)
2. Go to Advanced tab
3. Click Environment Variables
4. Under System Variables, click New
5. Set Variable name: OLLAMA_ORIGINS
6. Set Variable value: chrome-extension://*
7. Click OK to save

After setting the environment variable:
1. Restart your terminal/command prompt
2. Verify the variable is set:
   - macOS/Linux: `echo $OLLAMA_ORIGINS`
   - Windows: `echo %OLLAMA_ORIGINS%`
3. Restart Ollama
ollama serve