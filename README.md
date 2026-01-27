# My Inflation Basket

## Android Configuration

### Deep Links
To support the Supabase auth callback (`myinflationbasket://auth/callback`), the `AndroidManifest.xml` must be updated. 

Since the `android/` folder is generated in CI, you must ensure the manifest includes the following intent filter within the main `<activity>`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myinflationbasket" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```
