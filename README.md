# Detecting the Artificial

A cloud-native web platform for conducting multimodal human–AI detection studies. This system enables researchers to systematically evaluate human perceptual ability to distinguish AI-generated content from human-created content across text, image, video, and audio modalities.

## Overview

As generative AI models become increasingly sophisticated, understanding human perceptual limits in detecting synthetic media is critical for designing trustworthy systems, informing content moderation strategies, and evaluating AI safety. This platform provides reusable infrastructure for running rigorous, reproducible evaluation studies without rebuilding bespoke tools for each experiment.

## Key Features

- **Multimodal Support**: Present text, images, video, and audio stimuli within a unified interface
- **Flexible Task Design**: Configure forced-choice tasks ("Which one is human-made?") and single-item detection tasks ("Is this human or AI?")
- **Rich Data Collection**: Capture detection accuracy, confidence ratings (numeric scale), open-ended explanations, and basic demographics
- **Research-Grade Logging**: Structured data schema for statistical analysis, modality metadata, and model provenance
- **Cloud-Native Architecture**: Deployed with automated CI/CD, designed for scalability and reliability
- **Experimenter Interface**: Web-based admin panel for configuring studies, uploading stimuli, and exporting anonymized response data
- **Open Source**: Full codebase, documentation, and example configurations available for adaptation and extension

## Use Cases

* Evaluating human detection performance across state-of-the-art generative models (GPT, Claude, Gemini, FLUX, Midjourney, Sora, Veo, Eleven Labs, etc.)
* Analyzing confidence calibration (alignment between subjective certainty and actual accuracy)
* Identifying demographic predictors of detection vulnerability (age, education, technical literacy, AI exposure)
* Benchmarking new AI models to understand perceptual indistinguishability
* Supporting reproducible research as generative models continue to evolve

## License

MIT License — see [LICENSE](LICENSE) for details.
