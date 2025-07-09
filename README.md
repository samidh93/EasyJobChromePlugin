# EasyJob - LinkedIn Automation Chrome Extension

A Chrome extension that uses AI to automate LinkedIn job applications with a modern React-based popup interface.

## Features

- **React Popup Dashboard**: Modern, responsive interface built with React 18
- **AI-Powered Responses**: Uses Ollama for generating personalized job application responses
- **Profile Management**: YAML-based profile configuration
- **Conversation History**: Track AI conversations and responses
- **LinkedIn Integration**: Seamless integration with LinkedIn job pages

## Project Structure

```
├── src/
│   ├── popup/              # React popup components
│   │   ├── App.js          # Main React component
│   │   ├── App.css         # Popup styling
│   │   ├── index.js        # React entry point
│   │   └── popup.html      # HTML template
│   ├── background.js       # Chrome extension background script
│   ├── content.js          # LinkedIn page content script
│   ├── ai/                 # AI-related modules
│   └── linkedin/           # LinkedIn-specific utilities
├── dist/                   # Built extension files
├── assets/                 # Extension icons and assets
├── manifest.json           # Chrome extension manifest
├── webpack.config.cjs      # Webpack configuration for React
└── build.js               # Build script for extension files
```

## Development Setup

### Prerequisites

- Node.js 16+
- Chrome browser
- Ollama running locally (optional, for AI features)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build:all
   ```

### Build Scripts

- `npm run build:all` - Build both extension and React popup (production)
- `npm run build:dev` - Build both extension and React popup (development)
- `npm run build` - Build only extension files (background, content scripts)
- `npm run build:react` - Build only React popup (production)
- `npm run build:react:dev` - Build only React popup (development)
- `npm run watch:react` - Watch mode for React popup development

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project root directory
4. The extension will appear in your Chrome toolbar

## Usage

### Profile Setup

1. Click the extension icon to open the popup
2. Go to the "Profile" tab
3. Click "Download Example Profile" to get a template
4. Fill in your information and save as a YAML file
5. Click "Load Profile" to upload your profile

### Job Application

1. Navigate to a LinkedIn job posting
2. Open the extension popup
3. Ensure your profile is loaded
4. Click "Start Auto Apply"
5. The extension will automatically fill job application forms

### AI Conversations

1. Switch to the "AI Conversations" tab
2. View previous AI interactions
3. Filter by company, job, or specific questions
4. Review generated responses

## Technology Stack

- **Frontend**: React 18, CSS3, Lucide React icons
- **Build Tools**: Webpack 5, Babel, ESBuild
- **Chrome APIs**: Storage, Tabs, Scripting, Notifications
- **AI Integration**: Ollama local API
- **Data Format**: YAML for profiles, JSON for storage

## Architecture

The extension uses a hybrid build system:
- **Extension files** (background.js, content.js) are built with ESBuild
- **React popup** is built with Webpack and Babel
- Both systems output to the `dist/` directory

## Development

### React Popup Development

For active development of the React popup:

```bash
npm run watch:react
```

This will watch for changes and rebuild the popup automatically.

### Extension Development

For extension script development:

```bash
npm run dev
```

### Adding New Features

1. For popup features: Add React components in `src/popup/`
2. For extension features: Modify `src/background.js` or `src/content.js`
3. For AI features: Update files in `src/ai/`

## Security

- All data is stored locally using Chrome's storage API
- No external servers are contacted except for Ollama (localhost)
- Profile data is kept secure and never transmitted

## Troubleshooting

### Common Issues

1. **Extension not loading**: Check that `dist/` directory exists and contains built files
2. **React popup not working**: Ensure `npm run build:react` completed successfully
3. **Ollama connection issues**: Verify Ollama is running on localhost:11434

### Debug Mode

Open Chrome DevTools while the popup is open to see console logs and debug React components.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.