export const locales = {
  en: {
    language: "English",
    nav: { command: "Command center", tools: "Tool deck", event: "Event planner", creative: "Creative lab", learning: "Learning", guide: "Guide / ask" },
    labels: { synced: "Local workspace", enabled: "Enabled", disabled: "Disabled", save: "Save", add: "Add", close: "Close", ready: "Ready", approval: "Approval required", safe: "Safe mode", advanced: "Advanced" },
    hero: { eyebrow: "Standalone operations console", title: "Own the system. Shape the work.", body: "A local-first workspace for authorized security operations, Red / Blue event planning, documentation, learning, and tool design." },
    guide: { title: "Guide / ask", body: "Ask for a plan, explanation, checklist, or learning path. Answers are transparent about assumptions and keep authorized scope visible.", placeholder: "Ask anything about your workflow…" },
    creative: { title: "Creative lab", body: "Design your own tools, fields, prompts, and runbooks without changing the core application." },
    learning: { title: "Learning path", body: "Deployable modules with progress you control. Use them for onboarding, rehearsal, and after-action improvement." },
    event: { title: "Exercise command center", body: "Plan the event as a shared operating picture with Red, Blue, and White Cell lanes." }
  },
  es: {
    language: "Español",
    nav: { command: "Centro de mando", tools: "Panel de herramientas", event: "Plan del evento", creative: "Laboratorio creativo", learning: "Aprendizaje", guide: "Guía / preguntar" },
    labels: { synced: "Espacio local", enabled: "Activo", disabled: "Inactivo", save: "Guardar", add: "Añadir", close: "Cerrar", ready: "Listo", approval: "Requiere aprobación", safe: "Modo seguro", advanced: "Avanzado" },
    hero: { eyebrow: "Consola de operaciones independiente", title: "Sé dueño del sistema. Da forma al trabajo.", body: "Un espacio local para operaciones de seguridad autorizadas, planificación de eventos Red / Blue, documentación, aprendizaje y diseño de herramientas." },
    guide: { title: "Guía / preguntar", body: "Pide un plan, explicación, lista o ruta de aprendizaje. Las respuestas muestran sus supuestos y mantienen visible el alcance autorizado.", placeholder: "Pregunta sobre tu flujo de trabajo…" },
    creative: { title: "Laboratorio creativo", body: "Diseña tus propias herramientas, campos, prompts y runbooks sin cambiar la aplicación principal." },
    learning: { title: "Ruta de aprendizaje", body: "Módulos desplegables con progreso bajo tu control. Úsalos para incorporación, ensayo y mejora posterior." },
    event: { title: "Centro de mando del ejercicio", body: "Planifica el evento como una imagen operativa compartida con equipos Red, Blue y White Cell." }
  },
  fr: {
    language: "Français",
    nav: { command: "Centre de commande", tools: "Panneau d’outils", event: "Plan de l’événement", creative: "Laboratoire créatif", learning: "Apprentissage", guide: "Guide / demander" },
    labels: { synced: "Espace local", enabled: "Activé", disabled: "Désactivé", save: "Enregistrer", add: "Ajouter", close: "Fermer", ready: "Prêt", approval: "Approbation requise", safe: "Mode sûr", advanced: "Avancé" },
    hero: { eyebrow: "Console d’opérations indépendante", title: "Possédez le système. Façonnez le travail.", body: "Un espace local pour les opérations de sécurité autorisées, la planification Red / Blue, la documentation, l’apprentissage et la conception d’outils." },
    guide: { title: "Guide / demander", body: "Demandez un plan, une explication, une liste ou un parcours d’apprentissage. Les hypothèses restent transparentes et le périmètre autorisé visible.", placeholder: "Posez une question sur votre flux…" },
    creative: { title: "Laboratoire créatif", body: "Concevez vos outils, champs, prompts et runbooks sans modifier l’application principale." },
    learning: { title: "Parcours d’apprentissage", body: "Des modules déployables avec une progression que vous contrôlez. Utilisez-les pour l’intégration, les répétitions et les retours d’expérience." },
    event: { title: "Centre de commande de l’exercice", body: "Planifiez l’événement comme une image opérationnelle partagée avec les équipes Red, Blue et White Cell." }
  }
};

export function getLocale(locale = "en") {
  return locales[locale] ?? locales.en;
}
