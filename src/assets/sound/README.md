# Sound Assets Directory

This directory contains audio files for the application.

## Directory Structure

```
sound/
├── bgm/          # Background music files
│   └── main.mp3  # Main BGM (place your file here)
└── se/           # Sound effects
    └── *.mp3     # Sound effect files
```

## Adding BGM

1. Place your background music MP3 file at `bgm/main.mp3`
2. Update `src/App.tsx` to import the file:
   ```typescript
   import bgmpath from './assets/sound/bgm/main.mp3';
   ```
3. Replace the empty string constant with the import

## Note

Sound files are git-ignored except for .gitkeep files to keep repository size manageable.
Add your sound files locally or deploy them separately in production.
