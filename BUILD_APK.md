# Build the Android APK (one file: final.apk)

No Android Studio needed. GitHub builds it for you:

1. Create a new GitHub repository and upload everything in this folder
   (keep the `.github` folder).
2. Open the repo > **Actions** > **Build Android APK** > **Run workflow**.
3. After ~5-8 minutes, open the finished run and download the **final-apk**
   artifact. Unzip it to get `final.apk`.
4. Copy `final.apk` to the phone, open it, and allow "Install unknown apps".

Notes
- This is a debug-signed APK: fine for installing on your own / office phones,
  not for the Play Store.
- File exports (CSV, KML, Shapefile parts) open the Android Save/Share sheet.
- The Print buttons (GIS report) use window.print(), which Android
  WebView does not support. Use the share/export options instead.
- Google Fonts and the map/library CDNs inside tools/*.html need internet;
  the React hub itself works offline.
