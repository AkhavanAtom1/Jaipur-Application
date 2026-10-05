plugins {
    id("com.android.application")
}

android {
    namespace = "com.akhavan.jaipur"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.akhavan.jaipur"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
