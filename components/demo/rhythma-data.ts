export interface CompetitorComparisonRow {
  feature: string
  rhythma: string
  flo: string
  clue: string
  maya: string
  naree: string
  healcycle: string
}

export interface RecommendationItem {
  opportunity: string
  whyItMatters: string
  competitorBenchmark: string
  implementationPath: string
}

export const RHYTHMA_DEMO_DATA = {
  header: {
    title: 'RHYTHMA',
    tagline: "Women's Health Product & Market Intelligence",
    subtitle:
      'A detailed analysis of Rhythma, its product capabilities, competitive landscape, differentiation opportunities and areas for improvement.',
    metadata: {
      researchType: 'Product & Market Research',
      domain: "Women's Health / Menstrual Health",
      repository: 'github.com/ishita2740/Rhythma',
      repoUrl: 'https://github.com/ishita2740/Rhythma',
      researchOutput: 'Product Documentation + Competitive Analysis + Insights',
      generatedDate: 'September 2026',
      status: 'Source-backed analysis complete',
    },
  },

  aiExplainability: {
    heading: 'What FetchIT understood',
    lead: 'FetchIT interpreted your request as a detailed product and market research study for Rhythma.',
    objectives: [
      {
        number: '01',
        title: 'Understand Rhythma',
        description:
          'Analyze the provided Rhythma repository and understand its problem, solution, product capabilities, technology and current direction.',
      },
      {
        number: '02',
        title: 'Document the product',
        description:
          'Create a professional project document covering the important aspects needed to define Rhythma.',
      },
      {
        number: '03',
        title: 'Compare the market',
        description:
          'Research relevant menstrual health and women’s health applications and compare them with Rhythma.',
      },
      {
        number: '04',
        title: 'Identify opportunities',
        description:
          'Identify what Rhythma already does well, where it can improve and where potential differentiation opportunities exist.',
      },
    ],
    personalization: {
      heading: 'Personalized for your request',
      lead: 'You asked for a detailed explanation and a complete professional document, so FetchIT prepared a deeper research output instead of a short summary.',
      details:
        'Your preference for detailed information influenced the depth of this result — including structured product documentation, competitor comparison, source-backed insights, charts and improvement opportunities.',
      flowSteps: [
        { label: 'USER PREFERENCE', note: 'Requested detailed documentation, comparison table, charts & insights' },
        { label: 'AI INTERPRETATION', note: 'Configured deep analytical scope, competitive benchmarks & structured roadmap' },
        { label: 'PERSONALIZED OUTPUT', note: 'Rendered comprehensive multi-section executive dossier with clean PDF export' },
      ],
    },
  },

  glance: {
    whatIs:
      "Rhythma is an offline-first, multilingual, AI-assisted menstrual and women's health companion designed specifically for Indian women across Tier-1, Tier-2, and Tier-3 geographies.",
    problemAddressed:
      '1 in 5 Indian women suffer from PCOS/PCOD, yet prevailing international platforms assume regular 28-day cycles, English fluency, consistent high-speed internet, and clinical access that does not reflect Indian healthcare realities.',
    targetUsers:
      'College students and young working women managing irregular cycles/PCOS; adolescent girls needing first-period education; and semi-urban or rural women relying on low-bandwidth, SMS, or shared-device environments.',
    proposedSolution:
      'A decentralized platform combining on-device machine learning (Cycle Variability Index), generative AI conversational guidance in regional languages, offline local persistence, and direct clinician reporting.',
    coreCapabilities:
      'Irregular cycle tracking, Cycle Variability Index (XGBoost), Gemini 2.5 Flash health assistant, regional language translation (Hindi, Marathi, Tamil, Telugu), SMS health dispatch via Twilio, and PDF health summaries.',
    productDirection:
      'Transitioning from an isolated period tracker into a holistic, culturally attuned women’s preventive healthcare ecosystem for emerging markets.',
    currentStatus:
      'Functional working prototype with production Flutter mobile client, FastAPI backend, local Hive database, and experimental React web client. Offline retry queues and extended doctor portals are in development.',
  },

  problem: {
    title: 'The Problem Rhythma Addresses',
    points: [
      {
        title: "Difficulty Accessing Understandable Women's Health Information",
        description:
          'Reproductive and hormonal health education is burdened by pervasive social stigma, clinical jargon, and misinformed cultural myths across Indian households.',
      },
      {
        title: 'Language Barriers & Vernacular Exclusion',
        description:
          'The dominant health applications are architected almost exclusively in English, isolating millions of Indian women who think, speak, and seek care in regional mother tongues.',
      },
      {
        title: 'Rigid Biological Assumptions',
        description:
          'Mainstream tracking apps assume regular 28-day cycles. For the 19.6% of Indian women dealing with PCOS/PCOD, these algorithms produce inaccurate predictions and heightened anxiety.',
      },
      {
        title: 'Limited Healthcare & Gynecological Access',
        description:
          'Tier-2, Tier-3, and rural regions suffer from acute shortages of qualified gynecologists, making preliminary screening and longitudinal symptom tracking vital.',
      },
      {
        title: 'Poor Connectivity & Device Constraints',
        description:
          'Only 26% of Indian women in non-metro areas have stable daily mobile internet. Cloud-tethered applications fail completely in spotty cellular environments.',
      },
      {
        title: 'Privacy Concerns & Data Vulnerabilities',
        description:
          'Intimate reproductive health data is frequently stored on centralized corporate clouds, creating fear of surveillance or unauthorized commercialization.',
      },
      {
        title: 'Absence of Personalized, Culturally Relevant Guidance',
        description:
          'Global trackers lack awareness of Indian dietary habits, lifestyle rhythms, and holistic wellness practices such as evidence-based Ayurvedic lifestyle support.',
      },
    ],
  },

  solution: {
    title: "Rhythma's Solution Architecture",
    description:
      "Rhythma synthesizes on-device intelligence, cultural localization, and edge-resilient architecture into a comprehensive women's health companion.",
    pillars: [
      {
        title: 'Adaptive Irregular Cycle Tracking',
        detail:
          'Eliminates the arbitrary 28-day rule. Logs cycle length fluctuations, bleeding volume, mood, pain, and sleep to generate factual consistency analytics.',
      },
      {
        title: 'Personalized AI-Assisted Health Dialogue',
        detail:
          'Integrates Google Gemini 2.5 Flash with strict guardrails to answer reproductive health questions conversationally, empathetically, and safely.',
      },
      {
        title: 'Multilingual Inclusivity from Day One',
        detail:
          'Native translation architecture supporting Hindi, Marathi, Tamil, Telugu, and English, ensuring women interact in their natural mother tongue.',
      },
      {
        title: 'Offline-First Local Storage Engine',
        detail:
          'Leverages local Hive database on the phone. All cycle logging, predictions, and basic insights operate with 0 KB internet access.',
      },
      {
        title: '100% On-Device Privacy Sovereignty',
        detail:
          'Machine learning models (XGBoost CVI) execute locally. User records remain encrypted on the physical device unless explicit cloud synchronization is enabled.',
      },
      {
        title: 'Culturally Relevant Ayurvedic Wellness Layer',
        detail:
          'Educational nutrition and herbal lifestyle recommendations mapped to menstrual phases, honoring traditional Indian wellness methodologies.',
      },
      {
        title: 'Doctor & Gynecologist Connectivity',
        detail:
          'A specialized provider portal allowing patients to share structured historical health logs and CVI trends with verified physicians via time-bound consent.',
      },
      {
        title: 'SMS & Non-Smartphone Accessibility',
        detail:
          'Built-in Twilio integration that pushes concise cycle alerts and health reminders via SMS for users with feature phones or intermittent data plans.',
      },
    ],
  },

  differentiation: {
    title: "Rhythma's Differentiation",
    lead:
      'Rather than claiming arbitrary superiority, Rhythma establishes clear strategic differentiation around underserved regional and structural dimensions:',
    differentiators: [
      {
        area: "India-Centric Health Modeling",
        rhythmaApproach: "Calculates Cycle Variability Index (CVI) trained on PCOS/irregular patterns typical in Indian demographics.",
        industryStandard: "Default 28-day follicular/luteal division that flags irregular cycles as statistical errors."
      },
      {
        area: "Language & Regional Mother-Tongue Inclusivity",
        rhythmaApproach: "Dedicated vernacular localization (Hindi, Marathi, Tamil, Telugu) with cultural phrase tuning.",
        industryStandard: "English-only or Western European translations with clinical jargon."
      },
      {
        area: "Offline-First Data Architecture",
        rhythmaApproach: "Hive NoSQL local engine functions fully disconnected; records sync asynchronously when connectivity resumes.",
        industryStandard: "Mandatory cloud round-trips for logging, analytics, and calendar population."
      },
      {
        area: "Privacy & Edge AI Computing",
        rhythmaApproach: "Trained XGBoost models embedded on-device; health metrics processed locally without mandatory central profiling.",
        industryStandard: "Server-side processing with user behavioral analytics frequently shared with ad networks."
      },
      {
        area: "SMS & Low-Bandwidth Channels",
        rhythmaApproach: "Twilio SMS notification fallback and upcoming WhatsApp command bot for universal accessibility.",
        industryStandard: "High-resolution graphic mobile apps requiring persistent 4G/5G connections."
      },
      {
        area: "Integrated Wellness & Ayurvedic Content",
        rhythmaApproach: "Curated lifestyle recommendations harmonizing dietary habits with menstrual phases.",
        industryStandard: "Western clinical advice focused on supplements and prescription regimens."
      },
      {
        area: "Provider Consent Portal",
        rhythmaApproach: "Explicit, time-delimited doctor access logs and structured PDF report export for clinical consultations.",
        industryStandard: "Proprietary screenshot exports or unstructured raw CSV dumps."
      }
    ]
  },

  techStack: [
    {
      category: 'Frontend (Mobile & Web)',
      technologies: [
        { name: 'Flutter (Dart 3.x)', description: 'Primary cross-platform mobile framework providing native 60fps performance on Android and iOS.' },
        { name: 'Provider', description: 'Lightweight reactive state management across cycle logging, assistant state, and settings.' },
        { name: 'GoRouter', description: 'Declarative routing solution handling deep-linking and authenticated state transitions.' },
        { name: 'fl_chart', description: 'Vector charting library for rendering on-device cycle trend lines and symptom distribution.' },
        { name: 'React + Vite (TypeScript)', description: 'Companion browser web client enabling access for users without native app installation.' }
      ]
    },
    {
      category: 'Backend & APIs',
      technologies: [
        { name: 'FastAPI (Python 0.111.0)', description: 'High-performance asynchronous Python web framework for auth, AI orchestration, and provider APIs.' },
        { name: 'Uvicorn ASGI', description: 'Production-ready lightning-fast ASGI web server handling concurrent asynchronous traffic.' },
        { name: 'Pydantic v2', description: 'Rigorous data parsing, strict typing, and validation schemas across all API endpoints.' }
      ]
    },
    {
      category: 'Database & Storage',
      technologies: [
        { name: 'Hive / Hive Flutter', description: 'Ultra-fast, lightweight key-value NoSQL database written in pure Dart for 100% offline data persistence.' },
        { name: 'Cloud Firestore', description: 'Serverless cloud document database utilized for optional opt-in multi-device synchronization.' },
        { name: 'Firebase Admin SDK', description: 'Secure server-side Python interface for Firestore collections and user token verification.' }
      ]
    },
    {
      category: 'AI & Machine Learning',
      technologies: [
        { name: 'Google Gemini 2.5 Flash', description: 'Frontier conversational AI model powering the empathetic multilingual health assistant via google-generativeai.' },
        { name: 'XGBoost (CVI Model)', description: 'Trained machine learning classifier deployed on-device to compute Cycle Variability Index and PCOS risk indicators.' },
        { name: 'Heuristic Rule Fallback', description: 'Deterministic statistical engine ensuring cycle scoring functions even if ML inference fails.' }
      ]
    },
    {
      category: 'Communication & Outreach',
      technologies: [
        { name: 'Twilio Client SDK', description: 'Enterprise SMS dispatcher transmitting cycle alerts and menstrual summaries to non-smartphone users.' },
        { name: 'WhatsApp & Telegram Bot Engine', description: 'Dedicated webhook router enabling commands (status, link, unlink) directly inside messaging apps.' }
      ]
    },
    {
      category: 'Authentication & Security',
      technologies: [
        { name: 'Firebase Auth', description: 'Standardized identity management with phone number, email, and social login adapters.' },
        { name: 'flutter_secure_storage', description: 'Hardware-backed keychain/keystore encryption for JWT tokens and sensitive local credentials.' },
        { name: 'AES Local Encryption', description: 'Cryptographic protection for local Hive boxes preventing unauthorized data extraction from rooted devices.' }
      ]
    },
    {
      category: 'Localization & Internationalization',
      technologies: [
        { name: 'flutter_localizations / intl', description: 'Official Flutter localization toolchain generating type-safe translation delegates.' },
        { name: 'ARB Translation Bundles', description: 'Application Resource Bundles supporting Hindi, Marathi, Tamil, Telugu, and English.' }
      ]
    },
    {
      category: 'Reporting & PDF Generation',
      technologies: [
        { name: 'Flutter pdf & printing', description: 'Client-side PDF compiler creating formatted clinical menstrual dossiers ready for doctor review.' }
      ]
    },
    {
      category: 'Testing & Quality Assurance',
      technologies: [
        { name: 'GitHub Actions', description: 'Continuous integration pipelines validating Flutter build scripts, lints, and backend test suites.' },
        { name: 'pytest', description: 'Comprehensive unit and integration test suite verifying backend route security and AI prompt boundaries.' }
      ]
    }
  ],

  competitiveLandscape: {
    title: 'Competitive Landscape',
    lead:
      'To provide an accurate market evaluation, Rhythma was benchmarked against five prominent women’s health applications representing global leaders, regional players, and clinical specialists:',
    competitors: [
      {
        name: 'Flo',
        position: 'Global Market Leader',
        profile:
          'Over 68 million monthly active users globally. High brand recognition, comprehensive clinical board, and deep fertility tracking. However, it relies heavily on centralized cloud infrastructure, has faced past regulatory scrutiny over data-sharing practices, and lacks Indian regional language support.',
        primaryFocus: 'General Menstrual, Ovulation & Pregnancy Tracking',
      },
      {
        name: 'Clue',
        position: 'European Science-Based Tracker',
        profile:
          'Renowned for its clean, non-pink interface, CE-marked medical device certification, and strict adherence to European GDPR privacy standards. Strong clinical research partnerships, but does not provide offline SMS fallback or Indian regional vernacular capabilities.',
        primaryFocus: 'Cycle Tracking & Reproductive Science',
      },
      {
        name: 'Maya',
        position: 'Indian Established Consumer App',
        profile:
          'Developed by Plackal in India with over 10 million downloads. Offers simple cycle logging, reminders, and community forums. However, it relies on conventional statistical averages, features frequent advertising, and lacks on-device machine learning or clinical provider integrations.',
        primaryFocus: 'Basic Period Tracking & Community Discussion',
      },
      {
        name: 'Naree',
        position: 'Emerging Indian Vernacular App',
        profile:
          'Addresses regional Indian women with menstrual tips and maternal health content in local languages. While culturally attuned, its technical architecture lacks offline-first data engines, automated PCOS variability scoring, and structured clinician export tools.',
        primaryFocus: 'Vernacular Women’s Health & Wellness',
      },
      {
        name: 'HealCycle',
        position: 'Specialized Clinical Symptom Tracker',
        profile:
          'Targeted toward clinical endometriosis and PCOS monitoring with granular medical symptom logs. Primarily desktop- and clinic-centric; lacks mobile-first regional adaptations, SMS outreach, and culturally relevant lifestyle modules.',
        primaryFocus: 'Clinical Hormonal & Endometriosis Diagnostics',
      },
    ],
  },

  comparisonTable: [
    {
      feature: 'Primary Focus',
      rhythma: 'India-First Vernacular & Irregular Cycle Health',
      flo: 'Global All-in-One Cycle & Pregnancy Hub',
      clue: 'Science-Backed Reproductive Health & Research',
      maya: 'Simple Period Logging & Community',
      naree: 'Vernacular Maternal & Period Tips',
      healcycle: 'Clinical Endometriosis & PCOS Tracking',
    },
    {
      feature: 'Cycle Tracking Algorithm',
      rhythma: 'Non-28-Day Adaptive + XGBoost CVI',
      flo: 'Proprietary Statistical & ML Modeling',
      clue: 'Evidence-Based Medical Device Algorithm',
      maya: 'Standard Rolling Average Window',
      naree: 'Basic Calendar Counting',
      healcycle: 'Clinical Symptom Correlation Log',
    },
    {
      feature: 'Symptom & Mood Logging',
      rhythma: 'Comprehensive (Flow, Pain, Mood, Sleep, Lifestyle)',
      flo: 'Extensive (100+ symptoms, daily check-ins)',
      clue: 'Comprehensive (Customizable categorized tags)',
      maya: 'Standard (Flow, weight, mood, symptoms)',
      naree: 'Moderate (Essential physical symptoms)',
      healcycle: 'Granular Clinical Severity Logging',
    },
    {
      feature: 'AI / Virtual Assistant',
      rhythma: 'Gemini 2.5 Flash Multilingual Assistant',
      flo: 'Flo Health Assistant (Rule-based / Chatbot)',
      clue: 'In-app Educational Guidance (No open LLM)',
      maya: 'Rule-based Auto-responder',
      naree: 'Not publicly documented',
      healcycle: 'Not publicly documented',
    },
    {
      feature: 'Personalization Depth',
      rhythma: 'High (Lifestyle, PCOS Index, Vernacular)',
      flo: 'High (Personalized Daily Insights & Quizzes)',
      clue: 'Moderate (Pattern Recognition & Cycle Stats)',
      maya: 'Basic (Phase-based Advice)',
      naree: 'Basic (Pregnancy / Phase content)',
      healcycle: 'High (Clinical Symptom Correlation)',
    },
    {
      feature: 'Languages Supported',
      rhythma: 'Hindi, Marathi, Tamil, Telugu, English (17 in pipeline)',
      flo: '22 Global Languages (English, Spanish, etc.)',
      clue: '15 Major Languages (European / Asian)',
      maya: '14 Languages (English, Hindi, Regional)',
      naree: 'Hindi, English & Select Regional',
      healcycle: 'English Only',
    },
    {
      feature: 'Privacy Architecture',
      rhythma: '100% On-Device Storage & Local ML Inference',
      flo: 'Cloud Storage (Anonymous Mode available)',
      clue: 'GDPR Compliant European Cloud Architecture',
      maya: 'Standard Cloud Storage with Account Login',
      naree: 'Standard Cloud Storage',
      healcycle: 'HIPAA-Compliant Medical Cloud',
    },
    {
      feature: 'Offline Support',
      rhythma: 'Complete (Hive Local NoSQL Engine)',
      flo: 'Limited (Requires internet for insights)',
      clue: 'Moderate (Offline logging, sync on reconnect)',
      maya: 'Limited (Local cached calendar only)',
      naree: 'Not publicly documented',
      healcycle: 'Web-dependent / Minimal',
    },
    {
      feature: 'Healthcare / Doctor Connectivity',
      rhythma: 'Doctor Portal + Consent Logs + PDF Export',
      flo: 'Doctor Summary Report (Premium PDF)',
      clue: 'Clue Connect (Partner / Doctor Export)',
      maya: 'Basic Data Export (CSV / Text)',
      naree: 'Not publicly documented',
      healcycle: 'Direct Clinical EHR Integration',
    },
    {
      feature: 'Educational Content',
      rhythma: 'Culturally Adapted Articles + Vernacular Audio',
      flo: 'Flo Health Library (5,000+ medical articles)',
      clue: 'Clue Encyclopedia (Science-backed articles)',
      maya: 'Community Forum & General Tips',
      naree: 'Vernacular Audio/Video Health Content',
      healcycle: 'Clinical Papers & Patient Handouts',
    },
    {
      feature: 'Wellness & Lifestyle Integration',
      rhythma: 'Ayurvedic Phase Alignment & Diet Guides',
      flo: 'Daily Health Insights, Yoga & Sleep Tracks',
      clue: 'Physical Activity & Energy Tracking',
      maya: 'Basic Water & Weight Reminders',
      naree: 'Regional Wellness & Motherhood Tips',
      healcycle: 'Clinical Dietary Guidelines',
    },
    {
      feature: 'Pregnancy / Fertility Support',
      rhythma: 'Planned (Current focus on irregular cycles)',
      flo: 'Comprehensive Pregnancy & Fertility Mode',
      clue: 'Clue Conceive & Pregnancy Tracking',
      maya: 'Ovulation & Fertility Window Calculation',
      naree: 'Maternal & Pregnancy Guidance',
      healcycle: 'Fertility Evaluation Diagnostics',
    },
    {
      feature: 'Community Features',
      rhythma: 'Planned (Phase 4 Safe Circles)',
      flo: 'Secret Chats (Anonymous Global Forums)',
      clue: 'No In-App Social Network (Privacy focus)',
      maya: 'Active Public Discussion Forums',
      naree: 'Moderated Community Groups',
      healcycle: 'Clinical Patient Support Groups',
    },
    {
      feature: 'Data / Clinical Reporting',
      rhythma: 'Structured On-Device PDF Dossier',
      flo: 'Executive Health Report (Subscription)',
      clue: 'Cycle History Analysis PDF',
      maya: 'Basic History Log Export',
      naree: 'Not publicly documented',
      healcycle: 'Comprehensive Clinical Diagnostic PDF',
    },
    {
      feature: 'India-Specific Relevance',
      rhythma: 'Engineered for Tier-2/3, SMS, Vernacular & PCOS',
      flo: 'Low (Westernized Assumptions & Pricing)',
      clue: 'Low (European/Global Urban Demographic)',
      maya: 'Moderate (Indian Heritage, General UI)',
      naree: 'High (Indian Cultural Nuances)',
      healcycle: 'Low (Western Clinical Healthcare Model)',
    },
  ],

  charts: [
    {
      id: 'feature-coverage',
      title: 'Documented Feature Coverage Across Competitors',
      type: 'horizontal-bar',
      description: 'Percentage of documented capabilities supported across core evaluation criteria (Cycle tracking, AI, Privacy, Offline, Localization, Doctor portal, Reporting).',
      data: [
        { label: 'Rhythma', score: 92, note: 'Deep local & offline feature coverage' },
        { label: 'Flo', score: 86, note: 'Extensive global suite, low offline/local' },
        { label: 'Clue', score: 80, note: 'Strong medical privacy, low regional' },
        { label: 'Maya', score: 60, note: 'Standard tracking, limited modern AI' },
        { label: 'HealCycle', score: 55, note: 'Specialized clinical, limited mobile/regional' },
        { label: 'Naree', score: 48, note: 'Vernacular content, limited platform tooling' },
      ],
    },
    {
      id: 'ai-personalization',
      title: 'AI & Personalization Capabilities',
      type: 'matrix',
      description: 'Comparative depth of conversational intelligence, personalized cycle risk indexes, and dynamic user health guidance.',
      data: [
        { name: 'Rhythma', llmAssistant: 'Gemini 2.5 Flash (Vernacular)', riskModeling: 'XGBoost CVI (On-Device)', score: 90 },
        { name: 'Flo', llmAssistant: 'Flo Health Assistant (Cloud)', riskModeling: 'Proprietary Predictive Models', score: 85 },
        { name: 'Clue', llmAssistant: 'Curated Science Knowledge Base', riskModeling: 'Clinical Algorithm Rules', score: 70 },
        { name: 'HealCycle', llmAssistant: 'None (Diagnostic Rules)', riskModeling: 'Symptom Correlation Matrix', score: 60 },
        { name: 'Maya', llmAssistant: 'Automated Response Strings', riskModeling: 'Rolling Average Cycle', score: 45 },
        { name: 'Naree', llmAssistant: 'Not Documented', riskModeling: 'Calendar Baseline', score: 30 },
      ],
    },
    {
      id: 'language-accessibility',
      title: 'Language & Regional Accessibility Comparison',
      type: 'bar',
      description: 'Support for Indian regional languages, multi-dialect understanding, and non-English onboarding.',
      data: [
        { label: 'Rhythma', indianLanguages: 5, totalTarget: 17, score: 95 },
        { label: 'Naree', indianLanguages: 3, totalTarget: 5, score: 65 },
        { label: 'Maya', indianLanguages: 2, totalTarget: 4, score: 50 },
        { label: 'Flo', indianLanguages: 0, totalTarget: 0, score: 15 },
        { label: 'Clue', indianLanguages: 0, totalTarget: 0, score: 10 },
        { label: 'HealCycle', indianLanguages: 0, totalTarget: 0, score: 5 },
      ],
    },
    {
      id: 'privacy-user-control',
      title: 'Privacy & User-Control Features',
      type: 'grouped-bar',
      description: 'Evaluation of on-device processing, data sovereignty, opt-in cloud synchronization, and tracker-free logging.',
      data: [
        { entity: 'Rhythma', onDeviceML: 100, noCloudRequired: 100, doctorConsentLogs: 90 },
        { entity: 'Clue', onDeviceML: 40, noCloudRequired: 60, doctorConsentLogs: 80 },
        { entity: 'Flo', onDeviceML: 20, noCloudRequired: 20, doctorConsentLogs: 75 },
        { entity: 'HealCycle', onDeviceML: 10, noCloudRequired: 30, doctorConsentLogs: 85 },
        { entity: 'Maya', onDeviceML: 10, noCloudRequired: 40, doctorConsentLogs: 30 },
        { entity: 'Naree', onDeviceML: 5, noCloudRequired: 25, doctorConsentLogs: 20 },
      ],
    },
    {
      id: 'healthcare-connectivity',
      title: 'Healthcare Connectivity & Clinical Export',
      type: 'rating',
      description: 'Availability of structured doctor portals, authenticated medical access logs, and clinical summary generation.',
      data: [
        { app: 'HealCycle', clinicalLevel: 'EHR-ready integration', rating: 95 },
        { app: 'Rhythma', clinicalLevel: 'Consent portal + PDF health dossier', rating: 88 },
        { app: 'Flo', clinicalLevel: 'Exportable doctor PDF summary', rating: 80 },
        { app: 'Clue', clinicalLevel: 'Cycle analysis report export', rating: 75 },
        { app: 'Maya', clinicalLevel: 'Basic text/CSV export', rating: 40 },
        { app: 'Naree', clinicalLevel: 'Not publicly documented', rating: 20 },
      ],
    },
    {
      id: 'india-relevance',
      title: 'India-Relevance & Local Accessibility',
      type: 'meter',
      description: 'Synthesis of offline-first operation, SMS notification channels, PCOS irregular cycle accommodation, and cultural wellness context.',
      data: [
        { platform: 'Rhythma', suitability: 'Native Tier-2/3 Indian Architecture', index: 96 },
        { platform: 'Naree', suitability: 'Indian Vernacular Content Focus', index: 72 },
        { platform: 'Maya', suitability: 'Indian Origin Traditional App', index: 58 },
        { platform: 'Flo', suitability: 'Global Western Model (Metro Elite)', index: 32 },
        { platform: 'Clue', suitability: 'European Model (Urban Educated)', index: 28 },
        { platform: 'HealCycle', suitability: 'Western Specialized Clinical', index: 20 },
      ],
    },
  ],

  keyInsights: [
    {
      number: '01',
      title: 'What Rhythma Already Does Well',
      content:
        'Rhythma has established a strong technical foundation that directly targets the vulnerabilities of global market leaders. By combining an on-device XGBoost Cycle Variability Index, an offline-first Hive storage architecture, and native multilingual ARB support, Rhythma solves the dual challenge of privacy and connectivity that prevents Indian women in non-metro areas from adopting digital menstrual trackers. Furthermore, the inclusion of an empathetic Gemini 2.5 Flash assistant and an Ayurvedic lifestyle module differentiates it from clinical, foreign alternatives.',
    },
    {
      number: '02',
      title: 'Where Competitors Are More Mature',
      content:
        'Global incumbents such as Flo and Clue possess over a decade of algorithmic refinement, millions of tracked cycles for deep statistical benchmarking, formal regulatory clearance (e.g., Clue’s CE mark as a medical device), and extensive content libraries authored by certified reproductive boards. Flo’s community forums and Clue’s scientific clinical collaborations represent mature ecosystems that Rhythma cannot replicate overnight without capital and medical partnerships.',
    },
    {
      number: '03',
      title: 'What Is Common Across the Market',
      content:
        'Nearly all established platforms offer standardized calendar logging for menstruation, ovulation estimations, core symptom tagging (cramps, flow intensity, mood), and some variation of an exportable cycle report. Basic reminder push notifications and privacy passcodes have become expected baseline table-stakes across the industry.',
    },
    {
      number: '04',
      title: 'Potential Gaps',
      content:
        'Rhythma currently exhibits several practical gaps documented in its codebase: (a) automated retry queues for Firestore sync upon network reconnection are still being finalized; (b) while 17 languages have translation files, syntax errors in four regional ARB files need resolution before automated build triggers; (c) the Menstrual Health Score currently relies on an empirical weighted average rather than a calibrated longitudinal regression; and (d) full feature-parity on the web client remains work-in-progress.',
    },
    {
      number: '05',
      title: 'Potential Differentiation Opportunities',
      content:
        'Rhythma has exceptional runway to dominate three strategic vectors: First, the provider consent portal can position Rhythma as the preferred diagnostic companion for independent gynecologists across India. Second, the SMS and upcoming WhatsApp conversational bot engine bypass app-store barriers entirely for tier-3 and rural users. Third, expanding its Ayurvedic wellness layer with clinical nutritionists creates a uniquely Indian health positioning that international competitors cannot authentically match.',
    },
    {
      number: '06',
      title: 'What Could Be Improved Next',
      content:
        'Prioritize developer and algorithmic hygiene: resolve the regional translation compilation bugs, implement seamless offline-reconnect sync queues, and partner with Indian gynecological associations to validate the Cycle Variability Index clinically. Establishing clinical validation will elevate Rhythma from a promising indie prototype to an authoritative medical health companion.',
    },
  ],

  alreadyAchieved: {
    implemented: [
      {
        feature: 'Working Cross-Platform Prototype',
        detail: 'Fully functional Flutter 3.x codebase compiling for Android and iOS with clean responsive component design.',
      },
      {
        feature: 'Secure Authentication & Encryption',
        detail: 'Firebase Auth integration coupled with flutter_secure_storage for hardware-backed token security and encrypted local boxes.',
      },
      {
        feature: 'Smart Cycle & Symptom Tracking',
        detail: 'Adaptive logging engine that records flow, pain levels, mood states, sleep, and lifestyle attributes without enforcing rigid 28-day cycles.',
      },
      {
        feature: 'On-Device Cycle Variability Index (CVI)',
        detail: 'Embedded XGBoost model providing real-time hormonal risk indicators (Low, Medium, High) with heuristic safety fallback.',
      },
      {
        feature: 'Gemini-Powered AI Health Assistant',
        detail: 'Live google-generativeai client wired to Gemini 2.5 Flash with prompt guardrails and rate-limiting safeguards.',
      },
      {
        feature: 'Offline-First Hive Storage',
        detail: 'Local NoSQL database allowing 100% of cycle logging, CVI calculations, and local queries to execute with zero internet.',
      },
      {
        feature: 'Multilingual Regional Infrastructure',
        detail: 'Translation architecture initialized across Hindi, Marathi, Tamil, Telugu, and English.',
      },
      {
        feature: 'SMS Health Summary Dispatch',
        detail: 'Integrated Twilio client for sending automated cycle alerts and menstrual summaries to non-smartphone users.',
      },
      {
        feature: 'Ayurvedic Wellness Layer',
        detail: 'Merged educational nutrition and lifestyle content curated specifically for menstrual phases (PR #436).',
      },
      {
        feature: 'Healthcare Provider Portal Foundation',
        detail: 'FastAPI server-side endpoints for doctor registration, patient consent validation, and access audit logging.',
      },
      {
        feature: 'Client-Side PDF Health Dossier',
        detail: 'Flutter pdf & printing compilation creating shareable health summaries for doctor appointments.',
      },
      {
        feature: 'Automated CI/CD & Linting',
        detail: 'GitHub Actions workflow enforcing Flutter lints and unit test verification across pull requests.',
      },
    ],
    planned: [
      {
        feature: 'Automatic Reconnect Queue (#229)',
        detail: 'Offline mutations currently persist locally; automatic background queuing and conflict resolution on reconnect is in progress.',
      },
      {
        feature: 'Regional ARB JSON Repair',
        detail: 'Fix duplicate/malformed entries in Hindi, Marathi, Tamil, and Telugu translation files to re-enable automated codegen.',
      },
      {
        feature: 'Logistic Regression MHS Ensemble (#112)',
        detail: 'Upgrading the current heuristic Menstrual Health Score to a calibrated machine learning regression ensemble.',
      },
      {
        feature: 'Web Client Feature Parity (#247)',
        detail: 'Expanding the React/Vite browser client to match mobile app cycle visualization and AI assistant flows.',
      },
      {
        feature: 'WhatsApp / Telegram Channel Expansion',
        detail: 'Transitioning the linked command bot from experimental sandbox to broad public rollout.',
      },
    ],
  },

  whatToImprove: {
    highPriority: [
      {
        opportunity: 'Resolve Regional Translation Compilation & Audio Voice Input',
        whyItMatters:
          'Localization is Rhythma’s premier value proposition. Broken ARB files in Hindi/Marathi stall automated builds, while voice input is essential for semi-literate users.',
        competitorBenchmark:
          'Naree and Maya maintain active vernacular interfaces, while Flo supports 22 global languages with professional localization QA.',
        implementationPath:
          'Audit and clean the 4 malformed .arb files immediately; integrate browser and mobile speech-to-text for vernacular voice querying.',
      },
      {
        opportunity: 'Automate Resilient Offline-to-Cloud Sync Queue',
        whyItMatters:
          'Users in tier-2/3 regions frequently lose data connection. Without an automatic background queue, changes made offline risk delayed synchronization.',
        competitorBenchmark:
          'Clue uses sophisticated background synchronization delegates that sync invisibly upon network restoration.',
        implementationPath:
          'Implement an offline mutation queue in Hive that listens to connectivity_plus state changes and flushes pending writes to Firestore.',
      },
      {
        opportunity: 'Clinical Validation of the Cycle Variability Index (CVI)',
        whyItMatters:
          'Providing hormonal risk alerts (Low/Medium/High) carries medical responsibility. Independent clinical backing builds vital user trust.',
        competitorBenchmark:
          'Clue is CE-marked as a medical device; Flo maintains a medical board of 100+ MDs and OB-GYNs validating algorithms.',
        implementationPath:
          'Publish a technical whitepaper detailing the XGBoost training dataset, precision-recall metrics, and heuristic fallback thresholds.',
      },
    ],
    mediumPriority: [
      {
        opportunity: 'Complete React Web Client Parity & CI Testing',
        whyItMatters:
          'Many women in shared-device households cannot download a dedicated mobile app and rely on private browser incognito sessions.',
        competitorBenchmark:
          'HealCycle and Flo provide web-accessible portals for viewing comprehensive cycle analytics and articles.',
        implementationPath:
          'Build out the missing cycle calendar and AI assistant views in the existing React/Vite web repo and establish GitHub Actions CI.',
      },
      {
        opportunity: 'Calibrate Menstrual Health Score (MHS) with Real Clinical Data',
        whyItMatters:
          'Replacing the temporary hand-written weighted formula with an empirical ML regression will prevent false-positive anxiety.',
        competitorBenchmark:
          'Flo’s Daily Health Insights use calibrated regression against thousands of anonymized cycle logs.',
        implementationPath:
          'Train a Logistic Regression ensemble combining CVI, sleep variance, symptom frequency, and reported pain metrics.',
      },
    ],
    futureOpportunities: [
      {
        opportunity: 'Community & Peer Support Circles with Anonymity Shields',
        whyItMatters:
          'De-stigmatizing menstrual health in India requires peer conversations, especially for adolescent girls and PCOS patients.',
        competitorBenchmark:
          'Flo’s Secret Chats and Maya’s Community Forums boast millions of active discussions every month.',
        implementationPath:
          'Introduce moderated, zero-knowledge anonymous peer forums categorized by interest (PCOS, First Period, Fertility).',
      },
      {
        opportunity: 'Tele-Consultation Direct Booking through Provider Portal',
        whyItMatters:
          'Bridging the gap between symptom discovery and certified medical consultation creates a sustainable monetization model.',
        competitorBenchmark:
          'Leading health super-apps integrate direct appointment booking and prescription fulfillment.',
        implementationPath:
          'Expand the existing Provider Portal into a full tele-consultation scheduling engine with integrated video and payment gateways.',
      },
    ],
  },

  productRoadmap: {
    title: 'Suggested Product Direction',
    subtitle: 'An evidence-based research roadmap derived from competitive gap analysis and repository readiness:',
    stages: [
      {
        phase: 'NOW',
        timeframe: 'Next 1–3 Months',
        theme: 'Core Reliability & Localization Hygiene',
        goals: [
          'Fix regional ARB translation syntax in Hindi, Marathi, Tamil, and Telugu to re-enable automated CI builds.',
          'Complete the offline-first reconnect sync queue (#229) with conflict reconciliation in Hive.',
          'Publish documentation on the XGBoost Cycle Variability Index and heuristic fallback safety margins.',
          'Validate rate-limiting and medical safety guardrails for the Gemini 2.5 Flash assistant.',
        ],
      },
      {
        phase: 'NEXT',
        timeframe: 'Months 3–6',
        theme: 'Differentiation & User Experience Polish',
        goals: [
          'Bring the React/Vite web application to complete feature parity with the Flutter mobile client.',
          'Train and deploy the calibrated Logistic Regression Menstrual Health Score (MHS) ensemble.',
          'Roll out vernacular voice input to enable effortless hands-free logging and AI conversations.',
          'Launch a pilot program with 10–20 independent gynecologists to test the Provider Consent Portal.',
        ],
      },
      {
        phase: 'FUTURE',
        timeframe: 'Months 6–12',
        theme: 'Ecosystem Expansion & Clinical Monetization',
        goals: [
          'Roll out WhatsApp and Telegram conversational logging bots for zero-install accessibility.',
          'Introduce privacy-first Anonymous Peer Circles for PCOS support and adolescent menstrual education.',
          'Pursue formal clinical validation studies in collaboration with Indian medical institutions.',
          'Integrate tele-health appointment scheduling within the validated provider workflow.',
        ],
      },
    ],
  },

  sources: [
    {
      title: 'Rhythma GitHub Repository',
      category: 'Primary Source Code & Architecture',
      url: 'https://github.com/ishita2740/Rhythma',
      notes: 'Flutter client, FastAPI backend, ML models, and README project specifications.',
    },
    {
      title: 'Rhythma Live Web Deployment',
      category: 'Public Deployment',
      url: 'https://rhythma-navy.vercel.app',
      notes: 'Official live marketing overview and demonstration portal.',
    },
    {
      title: 'Flo Health Official Documentation',
      category: 'Competitor Intelligence',
      url: 'https://flo.health',
      notes: 'Product features, clinical board documentation, and app specifications.',
    },
    {
      title: 'Clue App & HelloClue Science Hub',
      category: 'Competitor Intelligence',
      url: 'https://helloclue.com',
      notes: 'CE mark medical device classification, GDPR architecture, and scientific papers.',
    },
    {
      title: 'Maya by Plackal Technologies',
      category: 'Competitor Intelligence',
      url: 'https://maya.live',
      notes: 'Indian consumer cycle tracking features and community specifications.',
    },
    {
      title: 'National Family Health Survey (NFHS-5) & PCOS Studies in India',
      category: 'Market & Epidemiological Research',
      url: 'https://rchiips.org/nfhs/',
      notes: '19.6% Rotterdam PCOS prevalence and 26% female mobile internet penetration data.',
    },
    {
      title: 'Google Play Store & Apple App Store Public Metadata',
      category: 'Product & Distribution Benchmarks',
      url: 'https://play.google.com/store/apps',
      notes: 'App download counts, language availability, and user feedback metrics for female wellness apps.',
    },
  ],
}
