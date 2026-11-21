# Fully offline Aadesh desktop app

## What will change
- Make a separate desktop build that bundles the app screens and required visual assets on the PC, with no hosted-site or font download needed to open it.
- Open the bundled app from Electron and keep its existing local browser storage and receipt-printing bridge.
- Keep the published website’s current startup behavior unchanged.
- Add a clear Windows build command and packaging setup so the installer can be created from the downloaded project.

## Technical details
- Configure the desktop-only build as a static client app with relative asset paths and local-file-safe routing; retain the existing web build configuration.
- Update Electron to load the generated local app rather than `https://aadeshh.lovable.app/`.
- Verify the desktop build’s output path, local assets, route navigation and print bridge, then check the preview build and diagnostics.
