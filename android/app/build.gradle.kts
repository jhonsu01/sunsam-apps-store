import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// La firma de release vive FUERA del repo. keystore.properties (ignorado por git) indica
// storeFile, storePassword, keyAlias y keyPassword.
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

// Copia offline de la tienda web (docs/) empaquetada en assets/site para funcionar sin red.
val siteAssets = layout.buildDirectory.dir("generated/siteAssets")
val copySite by tasks.registering(Copy::class) {
    from(rootProject.file("../docs"))
    into(siteAssets.map { it.dir("site") })
}

android {
    namespace = "com.jhonsu01.sunsamstore"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jhonsu01.sunsamstore"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
    }

    signingConfigs {
        create("release") {
            if (keystoreProps.isNotEmpty()) {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystoreProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures { buildConfig = true }

    sourceSets["main"].assets.srcDir(siteAssets)

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

tasks.named("preBuild") { dependsOn(copySite) }
