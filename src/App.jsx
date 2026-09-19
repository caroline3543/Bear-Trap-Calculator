import React, { useState, useMemo, useEffect, useRef } from "react";

/* ============================================================
   THEME / TOKENS — per design-system spec (cosy winter camping).
   Every value is a CSS custom property so the whole palette can
   swap between light and dark via a single class on the root div.
   ============================================================ */
const C = {
  bgPage: "var(--bgPage)",
  surface: "var(--surface)",
  headerDark: "var(--headerBg)",
  headerDark2: "var(--headerBorder)",
  cardBorder: "var(--cardBorder)",
  inputBg: "var(--inputBg)",
  inputBorder: "var(--inputBorder)",
  gold: "var(--gold)",
  goldStrong: "var(--goldStrong)",
  goldBg: "var(--goldBg)",
  goldBorder: "var(--goldBorder)",
  green: "var(--green)",
  greenBg: "var(--greenBg)",
  amber: "var(--amber)",
  amberBg: "var(--amberBg)",
  red: "var(--red)",
  redBg: "var(--redBg)",
  ink: "var(--ink)",
  sub: "var(--sub)",
  cocoa: "var(--cocoa)",
  cocoaDark: "var(--cocoaDark)",
  white: "var(--white)",
  teal: "var(--teal)",
  t9Amber: "var(--t9Amber)",
  statusT9Bg: "var(--statusT9Bg)",
  statusT9Text: "var(--statusT9Text)",
};

// Muted per-troop-type accent colors (used for dots/chips across the app).
const TYPE_COLOR = { infantry: "#8FAE87", lancer: "#8C9FCB", marksman: "#4F8C86" };

const TYPES = ["infantry", "lancer", "marksman"];
// Damage priority (Bear Trap meta): Marksman > Lancer > Infantry.
const FILL_ORDER = ["lancer", "infantry", "marksman"];
const TYPE_LABEL = { infantry: "Infantry", lancer: "Lancer", marksman: "Marksman" };
const TYPE_LABEL_KEY = { infantry: "infantryLabel", lancer: "lancerLabel", marksman: "marksmanLabel" };

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const TRANSLATIONS = {
  en: {
    troopPool: "Troop pool", troopPoolSub: "T10 is always used before T9 for the same troop type.",
    noTroops: "No troops entered yet — start here.", totalPoolLabel: "Total pool",
    clearAll: "Clear all troops", reset: "Reset",
    settings: "Settings", joinerSquadsLabel: "Joiner Squads", settingsSub: "Capacity applies to every joiner squad.",
    squadCapacity: "Squad capacity", numSquadsLabel: "Number of squads",
    rallyLeader: "Rally leader squad", rallyLeaderSub: "Reserves troops first, before the joiner squads are filled. Set your own composition.",
    rallyBaseCapacity: "Rally leader base capacity", cyrilleBoostLabel: "Cyrille Capacity Boost", snowApeBoostLabel: "Snow Ape Boost",
    ministerAppointed: "Minister of Strategy appointed", minister2000: "+2,000 capacity", minister3750: "+3,750 capacity",
    effectiveCapacity: "Effective capacity", percentages: "Percentages", exactAmounts: "Exact amounts",
    squadStrategy: "Squad strategy", squadStrategySub: "How the joiner composition is decided.",
    manual: "Short on Troops", manualNote: "Not enough troops? Set the exact split yourself.",
    recommended: "Enough Troops", recommendedNote: "Ton Ton's ratios — sliders adjust for your setup.",
    remainingAfterLabel: "Left after this squad", presetsLabel: "Saved setups", savePresetBtn: "💾 Save setup", presetNamePrompt: "Name this setup", loadPresetBtn: "Load", deletePresetBtn: "Delete", presetSavedToast: "Setup saved.", noPresetsYet: "No saved setups yet.", accountALabel: "Account A", accountBLabel: "Account B", switchedAccountToast: "Switched account.", renameAccountPrompt: "Rename this account",
    autoSplitBtn: "⚡ Auto Split", autoSplitApplied: "Auto split applied — fine-tune below.", minMarchMarksmanLabel: "Minimum Marksman per march", minMarchMarksmanHelp: "Auto Split tries to guarantee this much Marksman per march first, stock permitting. Leave at 0 for no minimum.",
    recPoolWarningShort: "May not work", recPoolWarningBanner: "This option may not work with your current troop pool — Marksman could fall below the 60,000 minimum. Try \u201cShort on Troops\u201d instead if that happens.",
    tiered: "Tiered", tieredNote: "Stronger squads fill first, Weaker split the rest.",
    squadResults: "Squad results", remainingTroopsHeading: "Remaining troops",
    totalAvailableLabel: "Total available", totalAllocatedLabel: "Total allocated", totalRemainingLabel: "Total remaining",
    capacityRequiredLabel: "Capacity required (all squads)", fullSquadsLabel: "Full squads", partialSquadsLabel: "Partial squads",
    unfilledSpacesLabel: "Unfilled squad spaces", savedAutomatically: "Saved automatically in this browser · nothing is ever sent anywhere.",
    availableStat: "Available", allocatedStat: "Allocated", remainingStat: "Remaining", partialStat: "Partial", unfilledStat: "Unfilled",
    lightToggle: "Light", darkToggle: "Dark", openLabel: "open", atCapacityLabel: "at capacity",
    infantryLabel: "Infantry", lancerLabel: "Lancer", marksmanLabel: "Marksman",
    fullPill: "Full", partialPill: "Partial", usesT9Pill: "Uses T9", addBtn: "Add",
    invalidTarget: "Invalid target", fixComposition: "Fix the composition above to see squad results.",
    squadLabel: "Squad", strongerLabel: "Stronger", weakerLabel: "Weaker", leaderLabel: "Rally Leader",
    recSourceNote: "Ton Ton recommends these joining ratios:", recSourceSub: "A solid baseline for most Rally Leaders.",
    recHeroNote: "The best ratio depends on your Rally Leader's heroes, hero gear, and chief gear — fine-tune the sliders below to match your own setup.",
    gen5Note: "This is the recommended ratio for Generation 5.",
    resetRatios: "Reset to Ton Ton's ratios",
    shortLabel: "short", compLabel: "Comp", infAbbr: "Inf", lanAbbr: "Lan", markAbbr: "Mark",
    addedManually: "added manually", fillRemaining: "Fill remaining", noTroopsLeftPool: "No troops left in any pool to fill this space.",
    availableWord: "available", remainingToAllocate: "Remaining to allocate", totalWord: "Total",
    mustEqual100: "must equal 100%", totals100: "Totals 100%",
    spacesRemainingBelow: "{a} spaces remaining below capacity.", exceedsCapacityBy: "Exceeds capacity by {a}.",
    marksmanFillsRest: "fills whatever's left after Infantry and Lancer, never below {a}.",
    spacesCantBeFilled: "{a} spaces per squad can't be filled — not enough total troops.",
    recShortfallWarning: "Only {a} Marksman available per squad — pool is short of the {b} minimum requested.",
    useInManual: "Use these numbers in Manual / Exact mode", howThisWorks: "How this works:",
    tieredStep1: "Stronger squads fill first — all identical to each other.",
    tieredStep2: "Weaker squads split whatever's left — also identical to each other.",
    tieredStep3: "Every squad keeps a little Infantry + Lancer, then loads up on Marksman for damage.",
    numberOfStrongerSquads: "Number of Stronger squads", squadsStrongerWeaker: "Squads 1–{a} are Stronger. Squads {b}–{c} are Weaker.",
    acceptableInfantryPerStronger: "Acceptable Infantry per Stronger squad",
    guaranteedStrongerFirst: "Guaranteed in every Stronger squad first — kept between 0.5% and 3% of squad capacity ({a}–{b}).",
    strongerSquadComposition: "Stronger squad composition",
    onlyInfantryAvailableRequested: "Only {a} Infantry available per squad (requested {b}).",
    onlyMarksmanShortMinimum: "Only {a} Marksman available per squad — pool is short of the {b} minimum.",
    minAcceptableMarksmanWeaker: "Minimum acceptable Marksman per Weaker squad",
    guaranteedWeakerMinimum: "Guaranteed in every Weaker squad — Stronger squads give up Marksman first if needed. Minimum {a}.",
    weakerSquadComposition: "Weaker squad composition",
    onlyMarksmanShortRequestedYield: "Only {a} Marksman available per squad — total pool is short of the {b} requested even after Stronger squads yield.",
    clearedTroopsToast: "Troops cleared.", resetToast: "Everything reset.", undoAction: "Undo",
    copyPlan: "Copy squad plan", copiedToast: "Copied to clipboard!", copyFailedToast: "Couldn't copy — try again.",
    autoLabel: "auto", marksmanBelow60kWarning: "Below the 60,000 minimum",
    infantryStockLimitWarning: "Not enough Infantry in your pool to go higher", lancerStockLimitWarning: "Not enough Lancer in your pool to go higher",
    scanScreenshotBtn: "📷 Scan a screenshot instead", scanScreenshotHide: "Hide scanner", screenshotLangLabel: "Screenshot language — match your game's UI language",
    chooseScreenshot: "Choose a screenshot", scanBtn: "Scan screenshot", scanningStatus: "Reading numbers…", scanResultsHeading: "Check the numbers",
    needsReviewNote: "needs review", applyToPoolBtn: "Apply to Troop Pool", appliedScanToast: "Scanned values applied to Troop Pool.",
    scanErrorMsg: "Couldn't read that image — try a clearer screenshot, or enter the numbers by hand below.",
    scanHint: "Works best with a clear, uncropped shot of the Troops Preview screen.", whatScannerRead: "What the scanner read",
    notAnImage: "That doesn't look like an image — try a screenshot (PNG or JPG).",
    scanInstructions: "In-game, tap your profile picture (top-left) → Troops → that screen shows your troop counts. Screenshot it, then upload it below.",
    scanRetryLangHint: "This didn't read well — try a different screenshot language above and scan again.", rescanBtn: "🔁 Scan again",
    scanTotalFailure: "Every language we tried came up empty on this screenshot. Try a clearer or less-compressed screenshot, or enter the numbers by hand in the fields below.",
    scanCropHint: "Scanning only reads what's visible above — scroll to frame just the numbers you want, or scan a section, scroll, and scan again to fill in the rest.",
    hasHeliosLabel: "I have Helios (T11) troops",
    appliedScanToOtherToast: "Scanned values applied to {a}.",
    autoDetectLangLabel: "Auto-detect the screenshot's language", detectedLangNote: "Detected: {a}",
    alwaysDoubleCheckNote: "OCR can misread individual digits even when a field looks fine — compare against your screenshot above before applying.",
  },
  it: {
    troopPool: "Riserva truppe", troopPoolSub: "Le T10 vengono sempre usate prima delle T9 per lo stesso tipo di truppa.",
    noTroops: "Nessuna truppa inserita — inizia qui.", totalPoolLabel: "Totale riserva",
    clearAll: "Cancella tutte le truppe", reset: "Reimposta",
    settings: "Impostazioni", joinerSquadsLabel: "Squadre di supporto", settingsSub: "La capacità si applica a ogni squadra di supporto.",
    squadCapacity: "Capacità squadra", numSquadsLabel: "Numero di squadre",
    rallyLeader: "Squadra del capo raduno", rallyLeaderSub: "Preleva truppe per prima, prima che vengano riempite le squadre di supporto. Imposta tu la composizione.",
    rallyBaseCapacity: "Capacità base del capo raduno", cyrilleBoostLabel: "Bonus capacità Cyrille", snowApeBoostLabel: "Bonus Scimmia delle Nevi",
    ministerAppointed: "Ministro della Strategia nominato", minister2000: "+2.000 capacità", minister3750: "+3.750 capacità",
    effectiveCapacity: "Capacità effettiva", percentages: "Percentuali", exactAmounts: "Quantità esatte",
    squadStrategy: "Strategia squadra", squadStrategySub: "Come viene decisa la composizione delle squadre di supporto.",
    manual: "Truppe insufficienti", manualNote: "Non hai abbastanza truppe? Imposta tu la suddivisione esatta.",
    recommended: "Truppe sufficienti", recommendedNote: "Le percentuali di Ton Ton — i cursori si adattano al tuo setup.",
    remainingAfterLabel: "Rimasti dopo questa squadra", presetsLabel: "Configurazioni salvate", savePresetBtn: "💾 Salva configurazione", presetNamePrompt: "Nome di questa configurazione", loadPresetBtn: "Carica", deletePresetBtn: "Elimina", presetSavedToast: "Configurazione salvata.", noPresetsYet: "Nessuna configurazione salvata.", accountALabel: "Account A", accountBLabel: "Account B", switchedAccountToast: "Account cambiato.", renameAccountPrompt: "Rinomina questo account",
    autoSplitBtn: "⚡ Divisione automatica", autoSplitApplied: "Divisione automatica applicata — regola qui sotto.", minMarchMarksmanLabel: "Tiratori minimi per marcia", minMarchMarksmanHelp: "La Divisione automatica cerca di garantire prima questa quantità di Tiratori per marcia, riserva permettendo. Lascia 0 per nessun minimo.",
    recPoolWarningShort: "Potrebbe non funzionare", recPoolWarningBanner: "Questa opzione potrebbe non funzionare con la tua riserva attuale — i Tiratori potrebbero scendere sotto il minimo di 60.000. Se succede, prova \u201cTruppe insufficienti\u201d.",
    tiered: "A livelli", tieredNote: "Le squadre Forti si riempiono per prime, le Deboli si dividono il resto.",
    squadResults: "Risultati squadra", remainingTroopsHeading: "Truppe rimanenti",
    totalAvailableLabel: "Totale disponibile", totalAllocatedLabel: "Totale assegnato", totalRemainingLabel: "Totale rimanente",
    capacityRequiredLabel: "Capacità richiesta (tutte le squadre)", fullSquadsLabel: "Squadre complete", partialSquadsLabel: "Squadre parziali",
    unfilledSpacesLabel: "Spazi squadra non riempiti", savedAutomatically: "Salvato automaticamente in questo browser · non viene mai inviato nulla.",
    availableStat: "Disponibile", allocatedStat: "Assegnato", remainingStat: "Rimanente", partialStat: "Parziale", unfilledStat: "Non riempito",
    lightToggle: "Chiaro", darkToggle: "Scuro", openLabel: "liberi", atCapacityLabel: "al completo",
    infantryLabel: "Fanteria", lancerLabel: "Lancieri", marksmanLabel: "Tiratori",
    fullPill: "Completa", partialPill: "Parziale", usesT9Pill: "Usa T9", addBtn: "Aggiungi",
    invalidTarget: "Obiettivo non valido", fixComposition: "Correggi la composizione sopra per vedere i risultati della squadra.",
    squadLabel: "Squadra", strongerLabel: "Forte", weakerLabel: "Debole", leaderLabel: "Capo raduno",
    recSourceNote: "Ton Ton consiglia queste percentuali di unione:", recSourceSub: "Una base solida per la maggior parte dei capi raduno.",
    recHeroNote: "Il rapporto migliore dipende dagli eroi del tuo capo raduno, dal loro equipaggiamento eroe e dall'equipaggiamento del capo — regola i cursori qui sotto in base alla tua configurazione.",
    gen5Note: "Questo è il rapporto consigliato per la Generazione 5.",
    resetRatios: "Ripristina le percentuali di Ton Ton",
    shortLabel: "mancano", compLabel: "Comp", infAbbr: "Fan", lanAbbr: "Lan", markAbbr: "Tir",
    addedManually: "aggiunto manualmente", fillRemaining: "Riempi il resto", noTroopsLeftPool: "Nessuna truppa rimasta in nessuna riserva per riempire questo spazio.",
    availableWord: "disponibili", remainingToAllocate: "Da assegnare", totalWord: "Totale",
    mustEqual100: "deve essere uguale a 100%", totals100: "Totale 100%",
    spacesRemainingBelow: "{a} spazi rimanenti sotto la capacità.", exceedsCapacityBy: "Supera la capacità di {a}.",
    marksmanFillsRest: "riempie ciò che resta dopo Fanteria e Lancieri, mai sotto {a}.",
    spacesCantBeFilled: "{a} spazi per squadra non possono essere riempiti — non ci sono abbastanza truppe totali.",
    recShortfallWarning: "Solo {a} Tiratori disponibili per squadra — la riserva è sotto il minimo richiesto di {b}.",
    useInManual: "Usa questi numeri in modalità Manuale / Quantità esatte", howThisWorks: "Come funziona:",
    tieredStep1: "Le squadre Forti si riempiono per prime — tutte identiche tra loro.",
    tieredStep2: "Le squadre Deboli dividono ciò che resta — anche loro identiche tra loro.",
    tieredStep3: "Ogni squadra tiene un po' di Fanteria e Lancieri, poi carica di Tiratori per il danno.",
    numberOfStrongerSquads: "Numero di squadre Forti", squadsStrongerWeaker: "Squadre 1–{a} sono Forti. Squadre {b}–{c} sono Deboli.",
    acceptableInfantryPerStronger: "Fanteria accettabile per squadra Forte",
    guaranteedStrongerFirst: "Garantita per prima in ogni squadra Forte — mantenuta tra lo 0,5% e il 3% della capacità della squadra ({a}–{b}).",
    strongerSquadComposition: "Composizione squadra Forte",
    onlyInfantryAvailableRequested: "Solo {a} Fanteria disponibile per squadra (richiesta {b}).",
    onlyMarksmanShortMinimum: "Solo {a} Tiratori disponibili per squadra — la riserva è sotto il minimo di {b}.",
    minAcceptableMarksmanWeaker: "Tiratori minimi accettabili per squadra Debole",
    guaranteedWeakerMinimum: "Garantito in ogni squadra Debole — le squadre Forti cedono Tiratori per prime se necessario. Minimo {a}.",
    weakerSquadComposition: "Composizione squadra Debole",
    onlyMarksmanShortRequestedYield: "Solo {a} Tiratori disponibili per squadra — la riserva totale è sotto i {b} richiesti anche dopo la cessione delle squadre Forti.",
    clearedTroopsToast: "Truppe cancellate.", resetToast: "Tutto reimpostato.", undoAction: "Annulla",
    copyPlan: "Copia piano squadre", copiedToast: "Copiato negli appunti!", copyFailedToast: "Copia non riuscita — riprova.",
    autoLabel: "auto", marksmanBelow60kWarning: "Sotto il minimo di 60.000",
    infantryStockLimitWarning: "Non hai abbastanza Fanteria in riserva per salire ancora", lancerStockLimitWarning: "Non hai abbastanza Lancieri in riserva per salire ancora",
    scanScreenshotBtn: "📷 Scansiona uno screenshot", scanScreenshotHide: "Nascondi lo scanner", screenshotLangLabel: "Lingua dello screenshot — deve corrispondere alla lingua dell'interfaccia di gioco",
    chooseScreenshot: "Scegli uno screenshot", scanBtn: "Scansiona lo screenshot", scanningStatus: "Lettura dei numeri…", scanResultsHeading: "Controlla i numeri",
    needsReviewNote: "da controllare", applyToPoolBtn: "Applica alla riserva truppe", appliedScanToast: "Valori scansionati applicati alla riserva truppe.",
    scanErrorMsg: "Impossibile leggere l'immagine — prova con uno screenshot più chiaro, oppure inserisci i numeri a mano qui sotto.",
    scanHint: "Funziona meglio con uno scatto chiaro e non ritagliato della schermata Anteprima Truppe.", whatScannerRead: "Cosa ha letto lo scanner",
    notAnImage: "Non sembra un'immagine — prova con uno screenshot (PNG o JPG).",
    scanInstructions: "Nel gioco, tocca la tua immagine del profilo (in alto a sinistra) → Truppe → quella schermata mostra il numero delle tue truppe. Fai uno screenshot e caricalo qui sotto.",
    scanRetryLangHint: "Non ha letto bene — prova una lingua dello screenshot diversa qui sopra e scansiona di nuovo.", rescanBtn: "🔁 Scansiona di nuovo",
    scanTotalFailure: "Nessuna delle lingue provate ha funzionato su questo screenshot. Prova uno screenshot più chiaro o meno compresso, oppure inserisci i numeri a mano nei campi qui sotto.",
    scanCropHint: "La scansione legge solo ciò che è visibile sopra — scorri per inquadrare solo i numeri che vuoi, oppure scansiona una sezione, scorri e scansiona di nuovo per completare il resto.",
    hasHeliosLabel: "Ho truppe Helios (T11)",
    appliedScanToOtherToast: "Valori scansionati applicati a {a}.",
    autoDetectLangLabel: "Rileva automaticamente la lingua dello screenshot", detectedLangNote: "Rilevata: {a}",
    alwaysDoubleCheckNote: "L'OCR può leggere male singole cifre anche quando un campo sembra corretto — confronta con lo screenshot sopra prima di applicare.",
  },
  es: {
    troopPool: "Reserva de tropas", troopPoolSub: "Las T10 siempre se usan antes que las T9 para el mismo tipo de tropa.",
    noTroops: "Aún no has introducido tropas — empieza aquí.", totalPoolLabel: "Total de la reserva",
    clearAll: "Borrar todas las tropas", reset: "Restablecer",
    settings: "Ajustes", joinerSquadsLabel: "Escuadrones de apoyo", settingsSub: "La capacidad se aplica a cada escuadrón de apoyo.",
    squadCapacity: "Capacidad del escuadrón", numSquadsLabel: "Número de escuadrones",
    rallyLeader: "Escuadrón del líder de asalto", rallyLeaderSub: "Toma tropas primero, antes de llenar los escuadrones de apoyo. Define tú la composición.",
    rallyBaseCapacity: "Capacidad base del líder de asalto", cyrilleBoostLabel: "Bonificación de capacidad Cyrille", snowApeBoostLabel: "Bonificación Mono de Nieve",
    ministerAppointed: "Ministro de Estrategia nombrado", minister2000: "+2.000 de capacidad", minister3750: "+3.750 de capacidad",
    effectiveCapacity: "Capacidad efectiva", percentages: "Porcentajes", exactAmounts: "Cantidades exactas",
    squadStrategy: "Estrategia de escuadrón", squadStrategySub: "Cómo se decide la composición de los escuadrones de apoyo.",
    manual: "Tropas insuficientes", manualNote: "¿No tienes suficientes tropas? Define tú el reparto exacto.",
    recommended: "Tropas suficientes", recommendedNote: "Las proporciones de Ton Ton — los controles se ajustan a tu configuración.",
    remainingAfterLabel: "Restantes tras este escuadrón", presetsLabel: "Configuraciones guardadas", savePresetBtn: "💾 Guardar configuración", presetNamePrompt: "Nombre de esta configuración", loadPresetBtn: "Cargar", deletePresetBtn: "Eliminar", presetSavedToast: "Configuración guardada.", noPresetsYet: "Aún no hay configuraciones guardadas.", accountALabel: "Cuenta A", accountBLabel: "Cuenta B", switchedAccountToast: "Cuenta cambiada.", renameAccountPrompt: "Cambiar el nombre de esta cuenta",
    autoSplitBtn: "⚡ División automática", autoSplitApplied: "División automática aplicada — ajusta abajo.", minMarchMarksmanLabel: "Tiradores mínimos por marcha", minMarchMarksmanHelp: "División automática intenta garantizar primero esta cantidad de Tiradores por marcha, si la reserva lo permite. Deja 0 para no fijar un mínimo.",
    recPoolWarningShort: "Podría no funcionar", recPoolWarningBanner: "Esta opción podría no funcionar con tu reserva actual — los Tiradores podrían caer por debajo del mínimo de 60.000. Si pasa, prueba \u201cTropas insuficientes\u201d.",
    tiered: "Por niveles", tieredNote: "Los escuadrones Fuertes se llenan primero, los Débiles reparten el resto.",
    squadResults: "Resultados del escuadrón", remainingTroopsHeading: "Tropas restantes",
    totalAvailableLabel: "Total disponible", totalAllocatedLabel: "Total asignado", totalRemainingLabel: "Total restante",
    capacityRequiredLabel: "Capacidad necesaria (todos los escuadrones)", fullSquadsLabel: "Escuadrones completos", partialSquadsLabel: "Escuadrones parciales",
    unfilledSpacesLabel: "Espacios de escuadrón sin llenar", savedAutomatically: "Se guarda automáticamente en este navegador · nunca se envía nada.",
    availableStat: "Disponible", allocatedStat: "Asignado", remainingStat: "Restante", partialStat: "Parcial", unfilledStat: "Sin llenar",
    lightToggle: "Claro", darkToggle: "Oscuro", openLabel: "libres", atCapacityLabel: "al máximo",
    infantryLabel: "Infantería", lancerLabel: "Lanceros", marksmanLabel: "Tiradores",
    fullPill: "Completo", partialPill: "Parcial", usesT9Pill: "Usa T9", addBtn: "Añadir",
    invalidTarget: "Objetivo no válido", fixComposition: "Corrige la composición de arriba para ver los resultados del escuadrón.",
    squadLabel: "Escuadrón", strongerLabel: "Fuerte", weakerLabel: "Débil", leaderLabel: "Líder de asalto",
    recSourceNote: "Ton Ton recomienda estas proporciones de unión:", recSourceSub: "Una base sólida para la mayoría de los líderes de asalto.",
    recHeroNote: "La mejor proporción depende de los héroes de tu líder de asalto, su equipo de héroe y el equipo de jefe — ajusta los controles de abajo según tu configuración.",
    gen5Note: "Esta es la proporción recomendada para la Generación 5.",
    resetRatios: "Restablecer a las proporciones de Ton Ton",
    shortLabel: "faltan", compLabel: "Comp", infAbbr: "Inf", lanAbbr: "Lan", markAbbr: "Tir",
    addedManually: "añadido manualmente", fillRemaining: "Rellenar el resto", noTroopsLeftPool: "No quedan tropas en ninguna reserva para llenar este espacio.",
    availableWord: "disponibles", remainingToAllocate: "Por asignar", totalWord: "Total",
    mustEqual100: "debe sumar 100%", totals100: "Suma 100%",
    spacesRemainingBelow: "{a} espacios restantes por debajo de la capacidad.", exceedsCapacityBy: "Supera la capacidad en {a}.",
    marksmanFillsRest: "ocupa lo que queda tras Infantería y Lanceros, nunca menos de {a}.",
    spacesCantBeFilled: "{a} espacios por escuadrón no se pueden llenar — no hay tropas suficientes en total.",
    recShortfallWarning: "Solo {a} Tiradores disponibles por escuadrón — la reserva está por debajo del mínimo solicitado de {b}.",
    useInManual: "Usar estos números en modo Manual / Cantidades exactas", howThisWorks: "Cómo funciona:",
    tieredStep1: "Los escuadrones Fuertes se llenan primero — todos idénticos entre sí.",
    tieredStep2: "Los escuadrones Débiles reparten lo que queda — también idénticos entre sí.",
    tieredStep3: "Cada escuadrón conserva algo de Infantería y Lanceros, y luego se carga de Tiradores para hacer daño.",
    numberOfStrongerSquads: "Número de escuadrones Fuertes", squadsStrongerWeaker: "Escuadrones 1–{a} son Fuertes. Escuadrones {b}–{c} son Débiles.",
    acceptableInfantryPerStronger: "Infantería aceptable por escuadrón Fuerte",
    guaranteedStrongerFirst: "Garantizada primero en cada escuadrón Fuerte — se mantiene entre 0,5% y 3% de la capacidad del escuadrón ({a}–{b}).",
    strongerSquadComposition: "Composición del escuadrón Fuerte",
    onlyInfantryAvailableRequested: "Solo {a} Infantería disponible por escuadrón (solicitada {b}).",
    onlyMarksmanShortMinimum: "Solo {a} Tiradores disponibles por escuadrón — la reserva está por debajo del mínimo de {b}.",
    minAcceptableMarksmanWeaker: "Tiradores mínimos aceptables por escuadrón Débil",
    guaranteedWeakerMinimum: "Garantizado en cada escuadrón Débil — los escuadrones Fuertes ceden Tiradores primero si hace falta. Mínimo {a}.",
    weakerSquadComposition: "Composición del escuadrón Débil",
    onlyMarksmanShortRequestedYield: "Solo {a} Tiradores disponibles por escuadrón — la reserva total está por debajo de los {b} solicitados incluso después de que los escuadrones Fuertes cedan.",
    clearedTroopsToast: "Tropas borradas.", resetToast: "Todo restablecido.", undoAction: "Deshacer",
    copyPlan: "Copiar plan de escuadrones", copiedToast: "¡Copiado al portapapeles!", copyFailedToast: "No se pudo copiar — inténtalo de nuevo.",
    autoLabel: "auto", marksmanBelow60kWarning: "Por debajo del mínimo de 60.000",
    infantryStockLimitWarning: "No tienes suficiente Infantería en la reserva para subir más", lancerStockLimitWarning: "No tienes suficientes Lanceros en la reserva para subir más",
    scanScreenshotBtn: "📷 Escanear una captura en su lugar", scanScreenshotHide: "Ocultar el escáner", screenshotLangLabel: "Idioma de la captura — debe coincidir con el idioma de la interfaz del juego",
    chooseScreenshot: "Elegir una captura", scanBtn: "Escanear captura", scanningStatus: "Leyendo los números…", scanResultsHeading: "Revisa los números",
    needsReviewNote: "revisar", applyToPoolBtn: "Aplicar a la reserva de tropas", appliedScanToast: "Valores escaneados aplicados a la reserva de tropas.",
    scanErrorMsg: "No se pudo leer esa imagen — prueba con una captura más clara, o introduce los números a mano abajo.",
    scanHint: "Funciona mejor con una captura clara y sin recortar de la pantalla de Vista previa de Tropas.", whatScannerRead: "Lo que leyó el escáner",
    notAnImage: "Eso no parece una imagen — prueba con una captura (PNG o JPG).",
    scanInstructions: "En el juego, toca tu foto de perfil (arriba a la izquierda) → Tropas → esa pantalla muestra tus tropas. Haz una captura y súbela abajo.",
    scanRetryLangHint: "Esto no se leyó bien — prueba con otro idioma de captura arriba y escanea de nuevo.", rescanBtn: "🔁 Escanear de nuevo",
    scanTotalFailure: "Ningún idioma probado funcionó con esta captura. Prueba con una captura más clara o menos comprimida, o introduce los números a mano en los campos de abajo.",
    scanCropHint: "El escaneo solo lee lo que se ve arriba — desplázate para encuadrar solo los números que quieres, o escanea una sección, desplázate y escanea de nuevo para completar el resto.",
    hasHeliosLabel: "Tengo tropas Helios (T11)",
    appliedScanToOtherToast: "Valores escaneados aplicados a {a}.",
    autoDetectLangLabel: "Detectar automáticamente el idioma de la captura", detectedLangNote: "Detectado: {a}",
    alwaysDoubleCheckNote: "El OCR puede leer mal cifras individuales incluso cuando un campo parece correcto — compara con la captura de arriba antes de aplicar.",
  },
  ko: {
    troopPool: "병력 보유량", troopPoolSub: "같은 병종이면 T9보다 T10을 항상 먼저 사용합니다.",
    noTroops: "아직 병력을 입력하지 않았습니다 — 여기서 시작하세요.", totalPoolLabel: "총 보유량",
    clearAll: "모든 병력 지우기", reset: "초기화",
    settings: "설정", joinerSquadsLabel: "지원 부대", settingsSub: "용량은 모든 지원 부대에 동일하게 적용됩니다.",
    squadCapacity: "부대 용량", numSquadsLabel: "부대 수",
    rallyLeader: "집결 대장 부대", rallyLeaderSub: "지원 부대를 채우기 전에 병력을 먼저 확보합니다. 구성은 직접 설정하세요.",
    rallyBaseCapacity: "집결 대장 기본 용량", cyrilleBoostLabel: "시릴 용량 보너스", snowApeBoostLabel: "눈원숭이 보너스",
    ministerAppointed: "전략 대신 임명됨", minister2000: "+2,000 용량", minister3750: "+3,750 용량",
    effectiveCapacity: "실효 용량", percentages: "비율", exactAmounts: "정확한 수량",
    squadStrategy: "부대 전략", squadStrategySub: "지원 부대의 구성을 결정하는 방식입니다.",
    manual: "병력 부족", manualNote: "병력이 부족한가요? 정확한 분배를 직접 설정하세요.",
    recommended: "병력 충분", recommendedNote: "Ton Ton의 비율 — 슬라이더로 설정에 맞게 조정하세요.",
    remainingAfterLabel: "이 부대 이후 남은 병력", presetsLabel: "저장된 설정", savePresetBtn: "💾 설정 저장", presetNamePrompt: "이 설정의 이름", loadPresetBtn: "불러오기", deletePresetBtn: "삭제", presetSavedToast: "설정이 저장되었습니다.", noPresetsYet: "저장된 설정이 없습니다.", accountALabel: "계정 A", accountBLabel: "계정 B", switchedAccountToast: "계정이 전환되었습니다.", renameAccountPrompt: "이 계정의 이름 바꾸기",
    autoSplitBtn: "⚡ 자동 분배", autoSplitApplied: "자동 분배가 적용되었습니다 — 아래에서 세부 조정하세요.", minMarchMarksmanLabel: "행군당 최소 저격수", minMarchMarksmanHelp: "자동 분배는 보유량이 허용하는 한 행군당 이만큼의 저격수를 먼저 확보하려 합니다. 최소치를 두지 않으려면 0으로 두세요.",
    recPoolWarningShort: "작동하지 않을 수 있음", recPoolWarningBanner: "현재 병력 보유량으로는 이 옵션이 맞지 않을 수 있습니다 — 저격수가 60,000 미만으로 떨어질 수 있습니다. 이 경우 \u201c병력 부족\u201d을 사용해 보세요.",
    tiered: "단계별", tieredNote: "강한 부대가 먼저 채워지고, 약한 부대가 나머지를 나눕니다.",
    squadResults: "부대 결과", remainingTroopsHeading: "남은 병력",
    totalAvailableLabel: "총 가용량", totalAllocatedLabel: "총 배정량", totalRemainingLabel: "총 잔여량",
    capacityRequiredLabel: "필요 용량 (전체 부대)", fullSquadsLabel: "가득 찬 부대", partialSquadsLabel: "부분 채워진 부대",
    unfilledSpacesLabel: "채워지지 않은 부대 공간", savedAutomatically: "이 브라우저에 자동으로 저장됩니다 · 어디에도 전송되지 않습니다.",
    availableStat: "가용", allocatedStat: "배정됨", remainingStat: "남음", partialStat: "부분", unfilledStat: "미충원",
    lightToggle: "라이트", darkToggle: "다크", openLabel: "남음", atCapacityLabel: "가득 참",
    infantryLabel: "보병", lancerLabel: "창병", marksmanLabel: "저격수",
    fullPill: "가득 참", partialPill: "부분", usesT9Pill: "T9 사용", addBtn: "추가",
    invalidTarget: "잘못된 목표", fixComposition: "부대 결과를 보려면 위의 구성을 수정하세요.",
    squadLabel: "부대", strongerLabel: "강함", weakerLabel: "약함", leaderLabel: "집결 대장",
    recSourceNote: "Ton Ton이 추천하는 합류 비율:", recSourceSub: "대부분의 집결 대장에게 적합한 기본값입니다.",
    recHeroNote: "최적의 비율은 집결 대장의 영웅, 영웅 장비, 사령관 장비에 따라 달라집니다 — 아래 슬라이더로 자신의 설정에 맞게 조정하세요.",
    gen5Note: "이것은 5세대(Generation 5)를 위한 권장 비율입니다.",
    resetRatios: "Ton Ton 비율로 재설정",
    shortLabel: "부족", compLabel: "구성", infAbbr: "보병", lanAbbr: "창병", markAbbr: "저격",
    addedManually: "수동으로 추가됨", fillRemaining: "남은 공간 채우기", noTroopsLeftPool: "이 공간을 채울 병력이 보유량에 남아있지 않습니다.",
    availableWord: "사용 가능", remainingToAllocate: "배분 남음", totalWord: "합계",
    mustEqual100: "100%가 되어야 합니다", totals100: "합계 100%",
    spacesRemainingBelow: "{a}개 공간이 용량 미만으로 남아 있습니다.", exceedsCapacityBy: "용량을 {a}만큼 초과했습니다.",
    marksmanFillsRest: "보병과 창병을 제외한 나머지를 채우며, {a} 아래로 내려가지 않습니다.",
    spacesCantBeFilled: "부대당 {a}개 공간을 채울 수 없습니다 — 전체 병력이 부족합니다.",
    recShortfallWarning: "부대당 저격수 {a}만 확보 가능 — 보유량이 요청된 최소치 {b}에 못 미칩니다.",
    useInManual: "이 수치를 수동 / 정확한 수량 모드에서 사용", howThisWorks: "작동 방식:",
    tieredStep1: "강한 부대가 먼저 채워집니다 — 모두 동일한 구성입니다.",
    tieredStep2: "약한 부대가 남은 것을 나눕니다 — 이들도 서로 동일한 구성입니다.",
    tieredStep3: "모든 부대는 보병과 창병을 약간 유지한 뒤, 피해를 위해 저격수를 채웁니다.",
    numberOfStrongerSquads: "강한 부대 수", squadsStrongerWeaker: "부대 1–{a}는 강함. 부대 {b}–{c}는 약함.",
    acceptableInfantryPerStronger: "강한 부대당 허용 보병 수",
    guaranteedStrongerFirst: "모든 강한 부대에서 먼저 보장되며 — 부대 용량의 0.5%~3% 사이로 유지됩니다 ({a}–{b}).",
    strongerSquadComposition: "강한 부대 구성",
    onlyInfantryAvailableRequested: "부대당 보병 {a}만 사용 가능 (요청 {b}).",
    onlyMarksmanShortMinimum: "부대당 저격수 {a}만 사용 가능 — 보유량이 최소치 {b}에 못 미칩니다.",
    minAcceptableMarksmanWeaker: "약한 부대당 최소 허용 저격수",
    guaranteedWeakerMinimum: "모든 약한 부대에서 보장되며 — 필요 시 강한 부대가 저격수를 먼저 양보합니다. 최소 {a}.",
    weakerSquadComposition: "약한 부대 구성",
    onlyMarksmanShortRequestedYield: "부대당 저격수 {a}만 사용 가능 — 강한 부대가 양보한 후에도 총 보유량이 요청된 {b}에 못 미칩니다.",
    clearedTroopsToast: "병력이 지워졌습니다.", resetToast: "모두 초기화되었습니다.", undoAction: "실행 취소",
    copyPlan: "부대 계획 복사", copiedToast: "클립보드에 복사되었습니다!", copyFailedToast: "복사하지 못했습니다 — 다시 시도하세요.",
    autoLabel: "자동", marksmanBelow60kWarning: "60,000 최소치 미만",
    infantryStockLimitWarning: "보유량에 보병이 부족하여 더 올릴 수 없습니다", lancerStockLimitWarning: "보유량에 창병이 부족하여 더 올릴 수 없습니다",
    scanScreenshotBtn: "📷 스크린샷 스캔하기", scanScreenshotHide: "스캐너 숨기기", screenshotLangLabel: "스크린샷 언어 — 게임 UI 언어와 일치해야 합니다",
    chooseScreenshot: "스크린샷 선택", scanBtn: "스크린샷 스캔", scanningStatus: "숫자를 읽는 중…", scanResultsHeading: "숫자 확인",
    needsReviewNote: "확인 필요", applyToPoolBtn: "병력 보유량에 적용", appliedScanToast: "스캔한 값이 병력 보유량에 적용되었습니다.",
    scanErrorMsg: "이미지를 읽을 수 없습니다 — 더 선명한 스크린샷을 시도하거나 아래에 직접 숫자를 입력하세요.",
    scanHint: "병력 미리보기 화면을 선명하고 자르지 않은 상태로 캡처하면 가장 잘 작동합니다.", whatScannerRead: "스캐너가 읽은 내용",
    notAnImage: "이미지가 아닌 것 같습니다 — 스크린샷(PNG 또는 JPG)을 시도하세요.",
    scanInstructions: "게임에서 프로필 사진(왼쪽 위)을 탭 → 병력 → 그 화면에 병력 수가 표시됩니다. 그 화면을 캡처해서 아래에 업로드하세요.",
    scanRetryLangHint: "잘 읽히지 않았습니다 — 위에서 다른 스크린샷 언어를 선택하고 다시 스캔해 보세요.", rescanBtn: "🔁 다시 스캔",
    scanTotalFailure: "시도한 모든 언어가 이 스크린샷에서 아무것도 찾지 못했습니다. 더 선명하거나 압축이 덜 된 스크린샷을 시도하거나, 아래 필드에 숫자를 직접 입력하세요.",
    scanCropHint: "스캔은 위에 보이는 부분만 읽습니다 — 원하는 숫자만 보이도록 스크롤하거나, 한 부분을 스캔한 뒤 스크롤해서 나머지를 다시 스캔하세요.",
    hasHeliosLabel: "헬리오스(T11) 병력을 보유하고 있습니다",
    appliedScanToOtherToast: "스캔한 값이 {a}에 적용되었습니다.",
    autoDetectLangLabel: "스크린샷 언어 자동 감지", detectedLangNote: "감지됨: {a}",
    alwaysDoubleCheckNote: "필드가 괜찮아 보여도 OCR이 개별 숫자를 잘못 읽을 수 있습니다 — 적용하기 전에 위 스크린샷과 대조하세요.",
  },
  de: {
    troopPool: "Truppenbestand", troopPoolSub: "T10 wird beim gleichen Truppentyp immer vor T9 verwendet.",
    noTroops: "Noch keine Truppen eingegeben — hier beginnen.", totalPoolLabel: "Gesamtbestand",
    clearAll: "Alle Truppen löschen", reset: "Zurücksetzen",
    settings: "Einstellungen", joinerSquadsLabel: "Verstärkungstrupps", settingsSub: "Die Kapazität gilt für jeden Verstärkungstrupp.",
    squadCapacity: "Truppkapazität", numSquadsLabel: "Anzahl der Trupps",
    rallyLeader: "Sammlungsanführer-Trupp", rallyLeaderSub: "Beansprucht zuerst Truppen, bevor die Verstärkungstrupps aufgefüllt werden. Lege die Zusammensetzung selbst fest.",
    rallyBaseCapacity: "Grundkapazität des Sammlungsanführers", cyrilleBoostLabel: "Cyrille-Kapazitätsbonus", snowApeBoostLabel: "Schneeaffe-Bonus",
    ministerAppointed: "Minister für Strategie ernannt", minister2000: "+2.000 Kapazität", minister3750: "+3.750 Kapazität",
    effectiveCapacity: "Effektive Kapazität", percentages: "Prozentsätze", exactAmounts: "Exakte Mengen",
    squadStrategy: "Truppstrategie", squadStrategySub: "Wie die Zusammensetzung der Verstärkungstrupps entschieden wird.",
    manual: "Zu wenig Truppen", manualNote: "Nicht genug Truppen? Lege die genaue Aufteilung selbst fest.",
    recommended: "Genug Truppen", recommendedNote: "Ton Tons Verhältnisse — Regler passen sich deinem Setup an.",
    remainingAfterLabel: "Übrig nach diesem Trupp", presetsLabel: "Gespeicherte Setups", savePresetBtn: "💾 Setup speichern", presetNamePrompt: "Name für dieses Setup", loadPresetBtn: "Laden", deletePresetBtn: "Löschen", presetSavedToast: "Setup gespeichert.", noPresetsYet: "Noch keine gespeicherten Setups.", accountALabel: "Konto A", accountBLabel: "Konto B", switchedAccountToast: "Konto gewechselt.", renameAccountPrompt: "Dieses Konto umbenennen",
    autoSplitBtn: "⚡ Automatisch aufteilen", autoSplitApplied: "Automatische Aufteilung angewendet — unten feinjustieren.", minMarchMarksmanLabel: "Minimum Scharfschützen pro Marsch", minMarchMarksmanHelp: "Automatisch aufteilen versucht zuerst, diese Menge Scharfschützen pro Marsch zu garantieren, sofern der Bestand es zulässt. Bei 0 kein Minimum.",
    recPoolWarningShort: "Funktioniert eventuell nicht", recPoolWarningBanner: "Diese Option funktioniert mit deinem aktuellen Truppenbestand eventuell nicht — Scharfschützen könnten unter das Minimum von 60.000 fallen. Versuch in dem Fall \u201cZu wenig Truppen\u201d.",
    tiered: "Gestuft", tieredNote: "Starke Trupps werden zuerst aufgefüllt, schwache teilen sich den Rest.",
    squadResults: "Truppergebnisse", remainingTroopsHeading: "Verbleibende Truppen",
    totalAvailableLabel: "Gesamt verfügbar", totalAllocatedLabel: "Gesamt zugewiesen", totalRemainingLabel: "Gesamt verbleibend",
    capacityRequiredLabel: "Benötigte Kapazität (alle Trupps)", fullSquadsLabel: "Volle Trupps", partialSquadsLabel: "Teilweise gefüllte Trupps",
    unfilledSpacesLabel: "Nicht gefüllte Truppplätze", savedAutomatically: "Wird automatisch in diesem Browser gespeichert · es wird nichts gesendet.",
    availableStat: "Verfügbar", allocatedStat: "Zugewiesen", remainingStat: "Verbleibend", partialStat: "Teilweise", unfilledStat: "Nicht gefüllt",
    lightToggle: "Hell", darkToggle: "Dunkel", openLabel: "frei", atCapacityLabel: "voll ausgelastet",
    infantryLabel: "Infanterie", lancerLabel: "Lanzenreiter", marksmanLabel: "Scharfschützen",
    fullPill: "Voll", partialPill: "Teilweise", usesT9Pill: "Nutzt T9", addBtn: "Hinzufügen",
    invalidTarget: "Ungültiges Ziel", fixComposition: "Korrigiere die Zusammensetzung oben, um die Truppergebnisse zu sehen.",
    squadLabel: "Trupp", strongerLabel: "Stark", weakerLabel: "Schwach", leaderLabel: "Sammlungsanführer",
    recSourceNote: "Ton Ton empfiehlt diese Beitritts-Verhältnisse:", recSourceSub: "Eine solide Basis für die meisten Sammlungsanführer.",
    recHeroNote: "Das beste Verhältnis hängt von den Helden deines Sammlungsanführers, deren Heldenausrüstung und der Anführerausrüstung ab — passe die Regler unten an dein eigenes Setup an.",
    gen5Note: "Dies ist das empfohlene Verhältnis für Generation 5.",
    resetRatios: "Auf Ton Tons Verhältnisse zurücksetzen",
    shortLabel: "fehlen", compLabel: "Zus", infAbbr: "Inf", lanAbbr: "Lan", markAbbr: "Sch",
    addedManually: "manuell hinzugefügt", fillRemaining: "Rest auffüllen", noTroopsLeftPool: "Keine Truppen mehr in irgendeinem Bestand, um diesen Platz zu füllen.",
    availableWord: "verfügbar", remainingToAllocate: "Noch zu verteilen", totalWord: "Gesamt",
    mustEqual100: "muss 100% ergeben", totals100: "Ergibt 100%",
    spacesRemainingBelow: "{a} Plätze verbleiben unter der Kapazität.", exceedsCapacityBy: "Überschreitet die Kapazität um {a}.",
    marksmanFillsRest: "füllt den Rest nach Infanterie und Lanzenreiter, nie unter {a}.",
    spacesCantBeFilled: "{a} Plätze pro Trupp können nicht gefüllt werden — nicht genug Truppen insgesamt.",
    recShortfallWarning: "Nur {a} Scharfschützen pro Trupp verfügbar — Bestand liegt unter dem angeforderten Minimum von {b}.",
    useInManual: "Diese Werte im Modus Manuell / Exakte Mengen verwenden", howThisWorks: "So funktioniert es:",
    tieredStep1: "Starke Trupps werden zuerst aufgefüllt — alle identisch zueinander.",
    tieredStep2: "Schwache Trupps teilen sich den Rest — ebenfalls identisch zueinander.",
    tieredStep3: "Jeder Trupp behält etwas Infanterie und Lanzenreiter und lädt dann mit Scharfschützen für Schaden auf.",
    numberOfStrongerSquads: "Anzahl der starken Trupps", squadsStrongerWeaker: "Trupps 1–{a} sind Stark. Trupps {b}–{c} sind Schwach.",
    acceptableInfantryPerStronger: "Akzeptable Infanterie pro starkem Trupp",
    guaranteedStrongerFirst: "Zuerst in jedem starken Trupp garantiert — bleibt zwischen 0,5% und 3% der Truppkapazität ({a}–{b}).",
    strongerSquadComposition: "Zusammensetzung des starken Trupps",
    onlyInfantryAvailableRequested: "Nur {a} Infanterie pro Trupp verfügbar (angefordert {b}).",
    onlyMarksmanShortMinimum: "Nur {a} Scharfschützen pro Trupp verfügbar — Bestand liegt unter dem Minimum von {b}.",
    minAcceptableMarksmanWeaker: "Minimal akzeptable Scharfschützen pro schwachem Trupp",
    guaranteedWeakerMinimum: "In jedem schwachen Trupp garantiert — starke Trupps geben bei Bedarf zuerst Scharfschützen ab. Minimum {a}.",
    weakerSquadComposition: "Zusammensetzung des schwachen Trupps",
    onlyMarksmanShortRequestedYield: "Nur {a} Scharfschützen pro Trupp verfügbar — Gesamtbestand liegt auch nach Abgabe der starken Trupps unter den angeforderten {b}.",
    clearedTroopsToast: "Truppen gelöscht.", resetToast: "Alles zurückgesetzt.", undoAction: "Rückgängig",
    copyPlan: "Truppplan kopieren", copiedToast: "In die Zwischenablage kopiert!", copyFailedToast: "Kopieren fehlgeschlagen — erneut versuchen.",
    autoLabel: "auto", marksmanBelow60kWarning: "Unter dem Minimum von 60.000",
    infantryStockLimitWarning: "Nicht genug Infanterie im Bestand, um weiter zu erhöhen", lancerStockLimitWarning: "Nicht genug Lanzenreiter im Bestand, um weiter zu erhöhen",
    scanScreenshotBtn: "📷 Stattdessen einen Screenshot scannen", scanScreenshotHide: "Scanner ausblenden", screenshotLangLabel: "Screenshot-Sprache — muss der Sprache der Spieloberfläche entsprechen",
    chooseScreenshot: "Screenshot auswählen", scanBtn: "Screenshot scannen", scanningStatus: "Zahlen werden gelesen…", scanResultsHeading: "Zahlen überprüfen",
    needsReviewNote: "muss geprüft werden", applyToPoolBtn: "Auf Truppenbestand anwenden", appliedScanToast: "Gescannte Werte auf den Truppenbestand angewendet.",
    scanErrorMsg: "Dieses Bild konnte nicht gelesen werden — versuche einen klareren Screenshot oder gib die Zahlen unten manuell ein.",
    scanHint: "Funktioniert am besten mit einer klaren, nicht zugeschnittenen Aufnahme des Truppenübersicht-Bildschirms.", whatScannerRead: "Was der Scanner gelesen hat",
    notAnImage: "Das sieht nicht wie ein Bild aus — versuche einen Screenshot (PNG oder JPG).",
    scanInstructions: "Tippe im Spiel auf dein Profilbild (oben links) → Truppen → dieser Bildschirm zeigt deine Truppenzahlen. Mach einen Screenshot davon und lade ihn unten hoch.",
    scanRetryLangHint: "Das wurde nicht gut gelesen — probiere oben eine andere Screenshot-Sprache und scanne erneut.", rescanBtn: "🔁 Erneut scannen",
    scanTotalFailure: "Keine der ausprobierten Sprachen konnte diesen Screenshot lesen. Versuche einen klareren oder weniger komprimierten Screenshot, oder gib die Zahlen unten manuell ein.",
    scanCropHint: "Der Scan liest nur, was oben sichtbar ist — scrolle, um nur die gewünschten Zahlen einzurahmen, oder scanne einen Abschnitt, scrolle weiter und scanne erneut, um den Rest zu ergänzen.",
    hasHeliosLabel: "Ich habe Helios-Truppen (T11)",
    appliedScanToOtherToast: "Gescannte Werte auf {a} angewendet.",
    autoDetectLangLabel: "Screenshot-Sprache automatisch erkennen", detectedLangNote: "Erkannt: {a}",
    alwaysDoubleCheckNote: "OCR kann einzelne Ziffern falsch lesen, selbst wenn ein Feld gut aussieht — vor dem Anwenden mit dem Screenshot oben vergleichen.",
  },
  ru: {
    troopPool: "Резерв войск", troopPoolSub: "Войска T10 всегда используются раньше T9 для одного типа войск.",
    noTroops: "Войска ещё не введены — начните здесь.", totalPoolLabel: "Всего в резерве",
    clearAll: "Очистить все войска", reset: "Сбросить",
    settings: "Настройки", joinerSquadsLabel: "Отряды поддержки", settingsSub: "Вместимость применяется к каждому отряду поддержки.",
    squadCapacity: "Вместимость отряда", numSquadsLabel: "Количество отрядов",
    rallyLeader: "Отряд лидера сбора", rallyLeaderSub: "Забирает войска первым, до заполнения отрядов поддержки. Состав задаётся вручную.",
    rallyBaseCapacity: "Базовая вместимость лидера сбора", cyrilleBoostLabel: "Бонус вместимости от Сирилла", snowApeBoostLabel: "Бонус Снежной обезьяны",
    ministerAppointed: "Назначен министр стратегии", minister2000: "+2000 вместимости", minister3750: "+3750 вместимости",
    effectiveCapacity: "Фактическая вместимость", percentages: "Проценты", exactAmounts: "Точные значения",
    squadStrategy: "Стратегия отряда", squadStrategySub: "Как определяется состав отрядов поддержки.",
    manual: "Не хватает войск", manualNote: "Не хватает войск? Задайте точное распределение сами.",
    recommended: "Войск достаточно", recommendedNote: "Соотношения Ton Ton — ползунки подстраиваются под вашу настройку.",
    remainingAfterLabel: "Осталось после этого отряда", presetsLabel: "Сохранённые настройки", savePresetBtn: "💾 Сохранить настройку", presetNamePrompt: "Название настройки", loadPresetBtn: "Загрузить", deletePresetBtn: "Удалить", presetSavedToast: "Настройка сохранена.", noPresetsYet: "Пока нет сохранённых настроек.", accountALabel: "Аккаунт A", accountBLabel: "Аккаунт B", switchedAccountToast: "Аккаунт переключён.", renameAccountPrompt: "Переименовать аккаунт",
    autoSplitBtn: "⚡ Авторазделение", autoSplitApplied: "Авторазделение применено — настройте ниже.", minMarchMarksmanLabel: "Минимум стрелков на поход", minMarchMarksmanHelp: "Авторазделение сначала пытается гарантировать это количество стрелков на поход, если позволяет резерв. Оставьте 0, чтобы не задавать минимум.",
    recPoolWarningShort: "Может не сработать", recPoolWarningBanner: "Этот вариант может не сработать с вашим текущим резервом — стрелки могут упасть ниже минимума в 60 000. Если так случится, попробуйте \u201cНе хватает войск\u201d.",
    tiered: "Многоуровневая", tieredNote: "Сильные отряды заполняются первыми, слабые делят остаток.",
    squadResults: "Результаты по отрядам", remainingTroopsHeading: "Оставшиеся войска",
    totalAvailableLabel: "Всего доступно", totalAllocatedLabel: "Всего распределено", totalRemainingLabel: "Всего осталось",
    capacityRequiredLabel: "Требуемая вместимость (все отряды)", fullSquadsLabel: "Полные отряды", partialSquadsLabel: "Частично заполненные отряды",
    unfilledSpacesLabel: "Незаполненные места в отрядах", savedAutomatically: "Автоматически сохраняется в этом браузере · никуда не отправляется.",
    availableStat: "Доступно", allocatedStat: "Распределено", remainingStat: "Осталось", partialStat: "Частично", unfilledStat: "Не заполнено",
    lightToggle: "Светлая", darkToggle: "Тёмная", openLabel: "свободно", atCapacityLabel: "заполнено",
    infantryLabel: "Пехота", lancerLabel: "Копейщики", marksmanLabel: "Стрелки",
    fullPill: "Полный", partialPill: "Частично", usesT9Pill: "Использует T9", addBtn: "Добавить",
    invalidTarget: "Недопустимая цель", fixComposition: "Исправьте состав выше, чтобы увидеть результаты отряда.",
    squadLabel: "Отряд", strongerLabel: "Сильный", weakerLabel: "Слабый", leaderLabel: "Лидер сбора",
    recSourceNote: "Ton Ton рекомендует такие соотношения для присоединения:", recSourceSub: "Надёжная основа для большинства лидеров сбора.",
    recHeroNote: "Лучшее соотношение зависит от героев вашего лидера сбора, их снаряжения героев и снаряжения командира — настройте ползунки ниже под свою конфигурацию.",
    gen5Note: "Это рекомендуемое соотношение для Поколения 5.",
    resetRatios: "Сбросить к соотношениям Ton Ton",
    shortLabel: "не хватает", compLabel: "Состав", infAbbr: "Пех", lanAbbr: "Коп", markAbbr: "Стр",
    addedManually: "добавлено вручную", fillRemaining: "Заполнить остаток", noTroopsLeftPool: "В резерве не осталось войск, чтобы заполнить это место.",
    availableWord: "доступно", remainingToAllocate: "Осталось распределить", totalWord: "Итого",
    mustEqual100: "должно быть равно 100%", totals100: "Итого 100%",
    spacesRemainingBelow: "{a} мест остаются незаполненными ниже вместимости.", exceedsCapacityBy: "Превышает вместимость на {a}.",
    marksmanFillsRest: "заполняет остаток после пехоты и копейщиков, никогда не ниже {a}.",
    spacesCantBeFilled: "{a} мест в отряде не могут быть заполнены — не хватает войск в целом.",
    recShortfallWarning: "Доступно только {a} стрелков на отряд — резерв ниже запрошенного минимума {b}.",
    useInManual: "Использовать эти значения в режиме Вручную / Точные значения", howThisWorks: "Как это работает:",
    tieredStep1: "Сильные отряды заполняются первыми — все они одинаковы между собой.",
    tieredStep2: "Слабые отряды делят остаток — также одинаковы между собой.",
    tieredStep3: "Каждый отряд сохраняет немного пехоты и копейщиков, а затем набирает стрелков для урона.",
    numberOfStrongerSquads: "Количество сильных отрядов", squadsStrongerWeaker: "Отряды 1–{a} — Сильные. Отряды {b}–{c} — Слабые.",
    acceptableInfantryPerStronger: "Допустимая пехота на сильный отряд",
    guaranteedStrongerFirst: "Гарантируется в первую очередь в каждом сильном отряде — сохраняется в пределах 0,5%–3% вместимости отряда ({a}–{b}).",
    strongerSquadComposition: "Состав сильного отряда",
    onlyInfantryAvailableRequested: "Доступно только {a} пехоты на отряд (запрошено {b}).",
    onlyMarksmanShortMinimum: "Доступно только {a} стрелков на отряд — резерв ниже минимума {b}.",
    minAcceptableMarksmanWeaker: "Минимально допустимые стрелки на слабый отряд",
    guaranteedWeakerMinimum: "Гарантируется в каждом слабом отряде — сильные отряды при необходимости уступают стрелков первыми. Минимум {a}.",
    weakerSquadComposition: "Состав слабого отряда",
    onlyMarksmanShortRequestedYield: "Доступно только {a} стрелков на отряд — общий резерв ниже запрошенных {b} даже после уступки сильных отрядов.",
    clearedTroopsToast: "Войска очищены.", resetToast: "Всё сброшено.", undoAction: "Отменить",
    copyPlan: "Скопировать план отрядов", copiedToast: "Скопировано в буфер обмена!", copyFailedToast: "Не удалось скопировать — попробуйте снова.",
    autoLabel: "авто", marksmanBelow60kWarning: "Ниже минимума в 60 000",
    infantryStockLimitWarning: "Недостаточно пехоты в резерве, чтобы поднять выше", lancerStockLimitWarning: "Недостаточно копейщиков в резерве, чтобы поднять выше",
    scanScreenshotBtn: "📷 Отсканировать скриншот", scanScreenshotHide: "Скрыть сканер", screenshotLangLabel: "Язык скриншота — должен совпадать с языком интерфейса игры",
    chooseScreenshot: "Выбрать скриншот", scanBtn: "Сканировать скриншот", scanningStatus: "Считывание чисел…", scanResultsHeading: "Проверьте числа",
    needsReviewNote: "требует проверки", applyToPoolBtn: "Применить к резерву войск", appliedScanToast: "Отсканированные значения применены к резерву войск.",
    scanErrorMsg: "Не удалось прочитать это изображение — попробуйте более чёткий скриншот или введите числа вручную ниже.",
    scanHint: "Лучше всего работает с чётким, необрезанным снимком экрана предпросмотра войск.", whatScannerRead: "Что прочитал сканер",
    notAnImage: "Это не похоже на изображение — попробуйте скриншот (PNG или JPG).",
    scanInstructions: "В игре нажмите на свой портрет (вверху слева) → Войска → этот экран показывает количество войск. Сделайте скриншот и загрузите его ниже.",
    scanRetryLangHint: "Это плохо считалось — попробуйте другой язык скриншота выше и отсканируйте снова.", rescanBtn: "🔁 Сканировать снова",
    scanTotalFailure: "Ни один из опробованных языков не смог прочитать этот скриншот. Попробуйте более чёткий или менее сжатый скриншот, либо введите числа вручную в поля ниже.",
    scanCropHint: "Сканирование считывает только то, что видно выше — прокрутите, чтобы показать только нужные числа, либо отсканируйте один участок, прокрутите и отсканируйте снова, чтобы дополнить остальное.",
    hasHeliosLabel: "У меня есть войска Гелиос (T11)",
    appliedScanToOtherToast: "Отсканированные значения применены к {a}.",
    autoDetectLangLabel: "Автоматически определить язык скриншота", detectedLangNote: "Определено: {a}",
    alwaysDoubleCheckNote: "OCR может неверно распознать отдельные цифры, даже если поле выглядит нормально — сверьте со скриншотом выше перед применением.",
  },
  pl: {
    troopPool: "Pula wojsk", troopPoolSub: "Wojska T10 są zawsze używane przed T9 dla tego samego typu wojsk.",
    noTroops: "Nie wprowadzono jeszcze wojsk — zacznij tutaj.", totalPoolLabel: "Łączna pula",
    clearAll: "Wyczyść wszystkie wojska", reset: "Resetuj",
    settings: "Ustawienia", joinerSquadsLabel: "Oddziały wsparcia", settingsSub: "Pojemność dotyczy każdego oddziału wsparcia.",
    squadCapacity: "Pojemność oddziału", numSquadsLabel: "Liczba oddziałów",
    rallyLeader: "Oddział lidera zgrupowania", rallyLeaderSub: "Pobiera wojska jako pierwszy, zanim wypełnione zostaną oddziały wsparcia. Skład ustawiasz sam.",
    rallyBaseCapacity: "Podstawowa pojemność lidera zgrupowania", cyrilleBoostLabel: "Bonus pojemności Cyrille", snowApeBoostLabel: "Bonus Śnieżnej Małpy",
    ministerAppointed: "Minister Strategii mianowany", minister2000: "+2000 pojemności", minister3750: "+3750 pojemności",
    effectiveCapacity: "Efektywna pojemność", percentages: "Procenty", exactAmounts: "Dokładne ilości",
    squadStrategy: "Strategia oddziału", squadStrategySub: "Jak ustalany jest skład oddziałów wsparcia.",
    manual: "Za mało wojsk", manualNote: "Za mało wojsk? Ustaw dokładny podział samodzielnie.",
    recommended: "Wystarczająco wojsk", recommendedNote: "Proporcje Ton Ton — suwaki dostosowują się do Twojej konfiguracji.",
    remainingAfterLabel: "Pozostało po tym oddziale", presetsLabel: "Zapisane konfiguracje", savePresetBtn: "💾 Zapisz konfigurację", presetNamePrompt: "Nazwa tej konfiguracji", loadPresetBtn: "Wczytaj", deletePresetBtn: "Usuń", presetSavedToast: "Konfiguracja zapisana.", noPresetsYet: "Brak zapisanych konfiguracji.", accountALabel: "Konto A", accountBLabel: "Konto B", switchedAccountToast: "Zmieniono konto.", renameAccountPrompt: "Zmień nazwę tego konta",
    autoSplitBtn: "⚡ Automatyczny podział", autoSplitApplied: "Zastosowano automatyczny podział — dostosuj poniżej.", minMarchMarksmanLabel: "Minimalna liczba Strzelców na marsz", minMarchMarksmanHelp: "Automatyczny podział najpierw próbuje zagwarantować tę liczbę Strzelców na marsz, o ile pula na to pozwala. Zostaw 0, aby nie ustawiać minimum.",
    recPoolWarningShort: "Może nie zadziałać", recPoolWarningBanner: "Ta opcja może nie zadziałać z Twoją obecną pulą — Strzelcy mogą spaść poniżej minimum 60 000. Jeśli tak się stanie, spróbuj \u201cZa mało wojsk\u201d.",
    tiered: "Warstwowy", tieredNote: "Silne oddziały wypełniane są jako pierwsze, słabe dzielą resztę.",
    squadResults: "Wyniki oddziału", remainingTroopsHeading: "Pozostałe wojska",
    totalAvailableLabel: "Łącznie dostępne", totalAllocatedLabel: "Łącznie przydzielone", totalRemainingLabel: "Łącznie pozostałe",
    capacityRequiredLabel: "Wymagana pojemność (wszystkie oddziały)", fullSquadsLabel: "Pełne oddziały", partialSquadsLabel: "Częściowo wypełnione oddziały",
    unfilledSpacesLabel: "Niewypełnione miejsca w oddziałach", savedAutomatically: "Zapisywane automatycznie w tej przeglądarce · nic nigdzie nie jest wysyłane.",
    availableStat: "Dostępne", allocatedStat: "Przydzielone", remainingStat: "Pozostałe", partialStat: "Częściowe", unfilledStat: "Niewypełnione",
    lightToggle: "Jasny", darkToggle: "Ciemny", openLabel: "wolne", atCapacityLabel: "pełna pojemność",
    infantryLabel: "Piechota", lancerLabel: "Lansjerzy", marksmanLabel: "Strzelcy",
    fullPill: "Pełny", partialPill: "Częściowy", usesT9Pill: "Używa T9", addBtn: "Dodaj",
    invalidTarget: "Nieprawidłowy cel", fixComposition: "Popraw skład powyżej, aby zobaczyć wyniki oddziału.",
    squadLabel: "Oddział", strongerLabel: "Silny", weakerLabel: "Słaby", leaderLabel: "Lider zgrupowania",
    recSourceNote: "Ton Ton zaleca następujące proporcje dołączania:", recSourceSub: "Solidna baza dla większości liderów zgrupowania.",
    recHeroNote: "Najlepsza proporcja zależy od bohaterów twojego lidera zgrupowania, ich ekwipunku bohatera i ekwipunku dowódcy — dostosuj poniższe suwaki do swojej konfiguracji.",
    gen5Note: "To jest zalecana proporcja dla Generacji 5.",
    resetRatios: "Przywróć proporcje Ton Ton",
    shortLabel: "brakuje", compLabel: "Skład", infAbbr: "Pie", lanAbbr: "Lan", markAbbr: "Strz",
    addedManually: "dodano ręcznie", fillRemaining: "Wypełnij resztę", noTroopsLeftPool: "W żadnej puli nie zostały wojska, aby wypełnić to miejsce.",
    availableWord: "dostępne", remainingToAllocate: "Pozostało do przydzielenia", totalWord: "Razem",
    mustEqual100: "musi wynosić 100%", totals100: "Razem 100%",
    spacesRemainingBelow: "{a} miejsc pozostaje poniżej pojemności.", exceedsCapacityBy: "Przekracza pojemność o {a}.",
    marksmanFillsRest: "wypełnia resztę po Piechocie i Lansjerach, nigdy poniżej {a}.",
    spacesCantBeFilled: "{a} miejsc na oddział nie można wypełnić — za mało wojsk ogółem.",
    recShortfallWarning: "Dostępnych tylko {a} Strzelców na oddział — pula jest poniżej wymaganego minimum {b}.",
    useInManual: "Użyj tych liczb w trybie Ręcznym / Dokładne ilości", howThisWorks: "Jak to działa:",
    tieredStep1: "Silne oddziały wypełniane są jako pierwsze — wszystkie identyczne.",
    tieredStep2: "Słabe oddziały dzielą resztę — również identyczne między sobą.",
    tieredStep3: "Każdy oddział zachowuje trochę Piechoty i Lansjerów, a resztę uzupełnia Strzelcami dla obrażeń.",
    numberOfStrongerSquads: "Liczba silnych oddziałów", squadsStrongerWeaker: "Oddziały 1–{a} są Silne. Oddziały {b}–{c} są Słabe.",
    acceptableInfantryPerStronger: "Akceptowalna Piechota na silny oddział",
    guaranteedStrongerFirst: "Gwarantowana jako pierwsza w każdym silnym oddziale — utrzymywana między 0,5% a 3% pojemności oddziału ({a}–{b}).",
    strongerSquadComposition: "Skład silnego oddziału",
    onlyInfantryAvailableRequested: "Dostępna tylko {a} Piechota na oddział (żądano {b}).",
    onlyMarksmanShortMinimum: "Dostępnych tylko {a} Strzelców na oddział — pula jest poniżej minimum {b}.",
    minAcceptableMarksmanWeaker: "Minimalna akceptowalna liczba Strzelców na słaby oddział",
    guaranteedWeakerMinimum: "Gwarantowane w każdym słabym oddziale — silne oddziały w razie potrzeby oddają Strzelców jako pierwsze. Minimum {a}.",
    weakerSquadComposition: "Skład słabego oddziału",
    onlyMarksmanShortRequestedYield: "Dostępnych tylko {a} Strzelców na oddział — łączna pula jest poniżej żądanych {b} nawet po ustąpieniu silnych oddziałów.",
    clearedTroopsToast: "Wojska wyczyszczone.", resetToast: "Wszystko zresetowane.", undoAction: "Cofnij",
    copyPlan: "Kopiuj plan oddziałów", copiedToast: "Skopiowano do schowka!", copyFailedToast: "Nie udało się skopiować — spróbuj ponownie.",
    autoLabel: "auto", marksmanBelow60kWarning: "Poniżej minimum 60 000",
    infantryStockLimitWarning: "Za mało Piechoty w puli, by ustawić wyżej", lancerStockLimitWarning: "Za mało Lansjerów w puli, by ustawić wyżej",
    scanScreenshotBtn: "📷 Zeskanuj zrzut ekranu", scanScreenshotHide: "Ukryj skaner", screenshotLangLabel: "Język zrzutu ekranu — musi zgadzać się z językiem interfejsu gry",
    chooseScreenshot: "Wybierz zrzut ekranu", scanBtn: "Skanuj zrzut ekranu", scanningStatus: "Odczytywanie liczb…", scanResultsHeading: "Sprawdź liczby",
    needsReviewNote: "do sprawdzenia", applyToPoolBtn: "Zastosuj do puli wojsk", appliedScanToast: "Zeskanowane wartości zastosowano do puli wojsk.",
    scanErrorMsg: "Nie udało się odczytać tego obrazu — spróbuj wyraźniejszego zrzutu ekranu lub wpisz liczby ręcznie poniżej.",
    scanHint: "Najlepiej działa z wyraźnym, nieprzyciętym zdjęciem ekranu podglądu wojsk.", whatScannerRead: "Co odczytał skaner",
    notAnImage: "To nie wygląda na obraz — spróbuj zrzutu ekranu (PNG lub JPG).",
    scanInstructions: "W grze dotknij swojego zdjęcia profilowego (lewy górny róg) → Wojska → ten ekran pokazuje liczbę Twoich wojsk. Zrób zrzut ekranu i prześlij go poniżej.",
    scanRetryLangHint: "To nie zostało dobrze odczytane — spróbuj innego języka zrzutu ekranu powyżej i zeskanuj ponownie.", rescanBtn: "🔁 Skanuj ponownie",
    scanTotalFailure: "Żaden z wypróbowanych języków nie poradził sobie z tym zrzutem ekranu. Spróbuj wyraźniejszego lub mniej skompresowanego zrzutu, albo wpisz liczby ręcznie w polach poniżej.",
    scanCropHint: "Skanowanie odczytuje tylko to, co widać powyżej — przewiń, aby pokazać tylko potrzebne liczby, albo zeskanuj jedną sekcję, przewiń i zeskanuj ponownie, aby uzupełnić resztę.",
    hasHeliosLabel: "Mam wojska Helios (T11)",
    appliedScanToOtherToast: "Zeskanowane wartości zastosowano do {a}.",
    autoDetectLangLabel: "Automatycznie wykryj język zrzutu ekranu", detectedLangNote: "Wykryto: {a}",
    alwaysDoubleCheckNote: "OCR może błędnie odczytać pojedyncze cyfry, nawet gdy pole wygląda dobrze — porównaj ze zrzutem ekranu powyżej przed zastosowaniem.",
  },
  tr: {
    troopPool: "Asker havuzu", troopPoolSub: "Aynı asker türü için T10 her zaman T9'dan önce kullanılır.",
    noTroops: "Henüz asker girilmedi — buradan başlayın.", totalPoolLabel: "Toplam havuz",
    clearAll: "Tüm askerleri temizle", reset: "Sıfırla",
    settings: "Ayarlar", joinerSquadsLabel: "Destek Birlikleri", settingsSub: "Kapasite her destek birliği için geçerlidir.",
    squadCapacity: "Birlik kapasitesi", numSquadsLabel: "Birlik sayısı",
    rallyLeader: "Toplanma lideri birliği", rallyLeaderSub: "Destek birlikleri doldurulmadan önce askerleri ilk o alır. Bileşimi kendiniz belirlersiniz.",
    rallyBaseCapacity: "Toplanma liderinin temel kapasitesi", cyrilleBoostLabel: "Cyrille Kapasite Artışı", snowApeBoostLabel: "Kar Maymunu Artışı",
    ministerAppointed: "Strateji Bakanı atandı", minister2000: "+2.000 kapasite", minister3750: "+3.750 kapasite",
    effectiveCapacity: "Etkin kapasite", percentages: "Yüzdeler", exactAmounts: "Kesin miktarlar",
    squadStrategy: "Birlik stratejisi", squadStrategySub: "Destek birliklerinin bileşiminin nasıl belirlendiği.",
    manual: "Asker Yetersiz", manualNote: "Yeterli asker yok mu? Kesin dağılımı kendiniz belirleyin.",
    recommended: "Asker Yeterli", recommendedNote: "Ton Ton\u2019un oranları — kaydırıcılar kurulumunuza göre ayarlanır.",
    remainingAfterLabel: "Bu birlikten sonra kalan", presetsLabel: "Kayıtlı kurulumlar", savePresetBtn: "💾 Kurulumu kaydet", presetNamePrompt: "Bu kuruluma isim ver", loadPresetBtn: "Yükle", deletePresetBtn: "Sil", presetSavedToast: "Kurulum kaydedildi.", noPresetsYet: "Henüz kayıtlı kurulum yok.", accountALabel: "Hesap A", accountBLabel: "Hesap B", switchedAccountToast: "Hesap değiştirildi.", renameAccountPrompt: "Bu hesabı yeniden adlandır",
    autoSplitBtn: "⚡ Otomatik Bölüştür", autoSplitApplied: "Otomatik bölüştürme uygulandı — aşağıdan ince ayar yapın.", minMarchMarksmanLabel: "Sefer başına minimum Nişancı", minMarchMarksmanHelp: "Otomatik Bölüştür, havuz izin verdiği sürece önce sefer başına bu kadar Nişancı garanti etmeye çalışır. Minimum istemiyorsanız 0 bırakın.",
    recPoolWarningShort: "Çalışmayabilir", recPoolWarningBanner: "Bu seçenek mevcut asker havuzunuzla çalışmayabilir — Nişancı 60.000 minimumunun altına düşebilir. Bu olursa \u201cAsker Yetersiz\u201d seçeneğini deneyin.",
    tiered: "Kademeli", tieredNote: "Güçlü birlikler önce doldurulur, Zayıf birlikler kalanı paylaşır.",
    squadResults: "Birlik sonuçları", remainingTroopsHeading: "Kalan askerler",
    totalAvailableLabel: "Toplam mevcut", totalAllocatedLabel: "Toplam ayrılan", totalRemainingLabel: "Toplam kalan",
    capacityRequiredLabel: "Gereken kapasite (tüm birlikler)", fullSquadsLabel: "Dolu birlikler", partialSquadsLabel: "Kısmen dolu birlikler",
    unfilledSpacesLabel: "Doldurulmamış birlik alanları", savedAutomatically: "Bu tarayıcıda otomatik olarak kaydedilir · hiçbir yere gönderilmez.",
    availableStat: "Mevcut", allocatedStat: "Ayrılan", remainingStat: "Kalan", partialStat: "Kısmi", unfilledStat: "Doldurulmadı",
    lightToggle: "Açık", darkToggle: "Koyu", openLabel: "boş", atCapacityLabel: "kapasite dolu",
    infantryLabel: "Piyade", lancerLabel: "Mızraklı", marksmanLabel: "Nişancı",
    fullPill: "Dolu", partialPill: "Kısmi", usesT9Pill: "T9 kullanıyor", addBtn: "Ekle",
    invalidTarget: "Geçersiz hedef", fixComposition: "Birlik sonuçlarını görmek için yukarıdaki bileşimi düzeltin.",
    squadLabel: "Birlik", strongerLabel: "Güçlü", weakerLabel: "Zayıf", leaderLabel: "Toplanma lideri",
    recSourceNote: "Ton Ton şu katılım oranlarını öneriyor:", recSourceSub: "Çoğu toplanma lideri için sağlam bir temel.",
    recHeroNote: "En iyi oran, toplanma liderinizin kahramanlarına, kahraman ekipmanına ve lider ekipmanına bağlıdır — kendi kurulumunuza göre aşağıdaki kaydırıcıları ayarlayın.",
    gen5Note: "Bu, 5. Nesil için önerilen orandır.",
    resetRatios: "Ton Ton oranlarına sıfırla",
    shortLabel: "eksik", compLabel: "Bileşim", infAbbr: "Piy", lanAbbr: "Mız", markAbbr: "Niş",
    addedManually: "manuel olarak eklendi", fillRemaining: "Kalanı doldur", noTroopsLeftPool: "Bu alanı doldurmak için hiçbir havuzda asker kalmadı.",
    availableWord: "mevcut", remainingToAllocate: "Dağıtılacak kalan", totalWord: "Toplam",
    mustEqual100: "%100 olmalı", totals100: "Toplam %100",
    spacesRemainingBelow: "{a} alan kapasitenin altında kalıyor.", exceedsCapacityBy: "Kapasiteyi {a} aşıyor.",
    marksmanFillsRest: "Piyade ve Mızraklıdan sonra kalanı doldurur, asla {a} altına düşmez.",
    spacesCantBeFilled: "Birlik başına {a} alan doldurulamıyor — toplamda yeterli asker yok.",
    recShortfallWarning: "Birlik başına yalnızca {a} Nişancı mevcut — havuz istenen {b} minimumunun altında.",
    useInManual: "Bu sayıları Manuel / Kesin miktarlar modunda kullan", howThisWorks: "Nasıl çalışır:",
    tieredStep1: "Güçlü birlikler önce doldurulur — hepsi birbirinin aynısıdır.",
    tieredStep2: "Zayıf birlikler kalanı paylaşır — onlar da birbirinin aynısıdır.",
    tieredStep3: "Her birlik biraz Piyade ve Mızraklı tutar, ardından hasar için Nişancı ile yüklenir.",
    numberOfStrongerSquads: "Güçlü birlik sayısı", squadsStrongerWeaker: "1–{a} birlikleri Güçlü. {b}–{c} birlikleri Zayıf.",
    acceptableInfantryPerStronger: "Güçlü birlik başına kabul edilebilir Piyade",
    guaranteedStrongerFirst: "Her Güçlü birlikte önce garanti edilir — birlik kapasitesinin %0,5 ile %3'ü arasında tutulur ({a}–{b}).",
    strongerSquadComposition: "Güçlü birlik bileşimi",
    onlyInfantryAvailableRequested: "Birlik başına yalnızca {a} Piyade mevcut (istenen {b}).",
    onlyMarksmanShortMinimum: "Birlik başına yalnızca {a} Nişancı mevcut — havuz {b} minimumunun altında.",
    minAcceptableMarksmanWeaker: "Zayıf birlik başına minimum kabul edilebilir Nişancı",
    guaranteedWeakerMinimum: "Her Zayıf birlikte garanti edilir — gerekirse Güçlü birlikler önce Nişancı bırakır. Minimum {a}.",
    weakerSquadComposition: "Zayıf birlik bileşimi",
    onlyMarksmanShortRequestedYield: "Birlik başına yalnızca {a} Nişancı mevcut — Güçlü birlikler bıraktıktan sonra bile toplam havuz istenen {b}'nin altında.",
    clearedTroopsToast: "Askerler temizlendi.", resetToast: "Her şey sıfırlandı.", undoAction: "Geri al",
    copyPlan: "Birlik planını kopyala", copiedToast: "Panoya kopyalandı!", copyFailedToast: "Kopyalanamadı — tekrar deneyin.",
    autoLabel: "otomatik", marksmanBelow60kWarning: "60.000 minimumunun altında",
    infantryStockLimitWarning: "Havuzda daha yükseğe çıkmak için yeterli Piyade yok", lancerStockLimitWarning: "Havuzda daha yükseğe çıkmak için yeterli Mızraklı yok",
    scanScreenshotBtn: "📷 Bunun yerine ekran görüntüsü tara", scanScreenshotHide: "Tarayıcıyı gizle", screenshotLangLabel: "Ekran görüntüsü dili — oyunun arayüz diliyle eşleşmeli",
    chooseScreenshot: "Ekran görüntüsü seç", scanBtn: "Ekran görüntüsünü tara", scanningStatus: "Sayılar okunuyor…", scanResultsHeading: "Sayıları kontrol et",
    needsReviewNote: "kontrol gerekli", applyToPoolBtn: "Asker Havuzuna Uygula", appliedScanToast: "Taranan değerler Asker Havuzuna uygulandı.",
    scanErrorMsg: "O görüntü okunamadı — daha net bir ekran görüntüsü deneyin veya sayıları aşağıya elle girin.",
    scanHint: "Asker Önizleme ekranının net ve kırpılmamış bir görüntüsüyle en iyi çalışır.", whatScannerRead: "Tarayıcının okuduğu",
    notAnImage: "Bu bir görüntüye benzemiyor — bir ekran görüntüsü (PNG veya JPG) deneyin.",
    scanInstructions: "Oyunda, profil resminize (sol üst) dokunun → Askerler → o ekran asker sayılarınızı gösterir. Ekran görüntüsü alın ve aşağıya yükleyin.",
    scanRetryLangHint: "Bu iyi okunmadı — yukarıdan farklı bir ekran görüntüsü dili deneyin ve tekrar tarayın.", rescanBtn: "🔁 Tekrar tara",
    scanTotalFailure: "Denenen dillerin hiçbiri bu ekran görüntüsünü okuyamadı. Daha net veya daha az sıkıştırılmış bir ekran görüntüsü deneyin, ya da sayıları aşağıdaki alanlara elle girin.",
    scanCropHint: "Tarama yalnızca yukarıda görünen kısmı okur — yalnızca istediğiniz sayıları göstermek için kaydırın, ya da bir bölümü tarayıp kaydırdıktan sonra kalanı taramak için tekrar tarayın.",
    hasHeliosLabel: "Helios (T11) askerlerim var",
    appliedScanToOtherToast: "Taranan değerler {a} hesabına uygulandı.",
    autoDetectLangLabel: "Ekran görüntüsü dilini otomatik algıla", detectedLangNote: "Algılanan: {a}",
    alwaysDoubleCheckNote: "Bir alan iyi görünse bile OCR tek tek rakamları yanlış okuyabilir — uygulamadan önce yukarıdaki ekran görüntüsüyle karşılaştırın.",
  },
  ar: {
    troopPool: "مجمع الجنود", troopPoolSub: "تُستخدم T10 دائمًا قبل T9 لنفس نوع الجندي.",
    noTroops: "لم يتم إدخال أي جنود بعد — ابدأ هنا.", totalPoolLabel: "إجمالي المجمع",
    clearAll: "مسح كل الجنود", reset: "إعادة تعيين",
    settings: "الإعدادات", joinerSquadsLabel: "فرق الانضمام", settingsSub: "تنطبق السعة على كل فرقة انضمام.",
    squadCapacity: "سعة الفرقة", numSquadsLabel: "عدد الفرق",
    rallyLeader: "فرقة قائد التجمع", rallyLeaderSub: "تحجز الجنود أولاً، قبل ملء فرق الانضمام. حدد التركيبة بنفسك.",
    rallyBaseCapacity: "السعة الأساسية لقائد التجمع", cyrilleBoostLabel: "تعزيز سعة سيريل", snowApeBoostLabel: "تعزيز قرد الثلج",
    ministerAppointed: "تم تعيين وزير الاستراتيجية", minister2000: "+2,000 سعة", minister3750: "+3,750 سعة",
    effectiveCapacity: "السعة الفعلية", percentages: "نسب مئوية", exactAmounts: "كميات دقيقة",
    squadStrategy: "استراتيجية الفرقة", squadStrategySub: "كيف يتم تحديد تركيبة فرق الانضمام.",
    manual: "جنود غير كافيين", manualNote: "لا يوجد جنود كافيين؟ حدد التقسيم الدقيق بنفسك.",
    recommended: "جنود كافيون", recommendedNote: "نسب Ton Ton — أشرطة التمرير تتكيف مع إعدادك.",
    remainingAfterLabel: "المتبقي بعد هذه الفرقة", presetsLabel: "الإعدادات المحفوظة", savePresetBtn: "💾 حفظ الإعداد", presetNamePrompt: "اسم هذا الإعداد", loadPresetBtn: "تحميل", deletePresetBtn: "حذف", presetSavedToast: "تم حفظ الإعداد.", noPresetsYet: "لا توجد إعدادات محفوظة بعد.", accountALabel: "الحساب A", accountBLabel: "الحساب B", switchedAccountToast: "تم تبديل الحساب.", renameAccountPrompt: "إعادة تسمية هذا الحساب",
    autoSplitBtn: "⚡ تقسيم تلقائي", autoSplitApplied: "تم تطبيق التقسيم التلقائي — اضبطه أدناه.", minMarchMarksmanLabel: "الحد الأدنى من الرماة لكل مسيرة", minMarchMarksmanHelp: "يحاول التقسيم التلقائي ضمان هذا العدد من الرماة لكل مسيرة أولاً، إذا سمح المخزون. اتركه عند 0 لعدم وجود حد أدنى.",
    recPoolWarningShort: "قد لا يعمل", recPoolWarningBanner: "قد لا يعمل هذا الخيار مع مجمع جنودك الحالي — قد ينخفض عدد الرماة عن الحد الأدنى 60,000. جرّب «جنود غير كافيين» بدلاً من ذلك إذا حدث ذلك.",
    tiered: "متدرج", tieredNote: "تمتلئ الفرق الأقوى أولاً، وتقسم الفرق الأضعف الباقي.",
    squadResults: "نتائج الفرق", remainingTroopsHeading: "الجنود المتبقون",
    totalAvailableLabel: "إجمالي المتاح", totalAllocatedLabel: "إجمالي المخصص", totalRemainingLabel: "إجمالي المتبقي",
    capacityRequiredLabel: "السعة المطلوبة (كل الفرق)", fullSquadsLabel: "الفرق الممتلئة", partialSquadsLabel: "الفرق الجزئية",
    unfilledSpacesLabel: "أماكن الفرق غير المملوءة", savedAutomatically: "يُحفظ تلقائيًا في هذا المتصفح · لا يُرسل شيء إلى أي مكان.",
    availableStat: "متاح", allocatedStat: "مخصص", remainingStat: "متبقٍ", partialStat: "جزئي", unfilledStat: "غير ممتلئ",
    lightToggle: "فاتح", darkToggle: "داكن", openLabel: "متبقٍ", atCapacityLabel: "عند الحد الأقصى",
    infantryLabel: "مشاة", lancerLabel: "رماح", marksmanLabel: "رماة",
    fullPill: "ممتلئة", partialPill: "جزئية", usesT9Pill: "يستخدم T9", addBtn: "إضافة",
    invalidTarget: "هدف غير صالح", fixComposition: "صحّح التركيبة أعلاه لرؤية نتائج الفرق.",
    squadLabel: "الفرقة", strongerLabel: "الأقوى", weakerLabel: "الأضعف", leaderLabel: "قائد التجمع",
    recSourceNote: "يوصي Ton Ton بنسب الانضمام التالية:", recSourceSub: "أساس متين لمعظم قادة التجمع.",
    recHeroNote: "تعتمد أفضل نسبة على أبطال قائد التجمع، وعتاد الأبطال، وعتاد القائد — اضبط أشرطة التمرير أدناه لتناسب إعدادك.",
    gen5Note: "هذه هي النسبة الموصى بها للجيل الخامس.",
    resetRatios: "إعادة التعيين إلى نسب Ton Ton",
    shortLabel: "نقص", compLabel: "التركيبة", infAbbr: "مش", lanAbbr: "رمح", markAbbr: "رمي",
    addedManually: "أُضيف يدويًا", fillRemaining: "املأ المتبقي", noTroopsLeftPool: "لم يتبق أي جنود في أي مجمع لملء هذا المكان.",
    availableWord: "متاح", remainingToAllocate: "المتبقي للتخصيص", totalWord: "الإجمالي",
    mustEqual100: "يجب أن يساوي 100%", totals100: "المجموع 100%",
    spacesRemainingBelow: "{a} أماكن متبقية أسفل السعة.", exceedsCapacityBy: "يتجاوز السعة بمقدار {a}.",
    marksmanFillsRest: "يملأ ما تبقى بعد المشاة والرماح، ولا ينخفض أبدًا عن {a}.",
    spacesCantBeFilled: "{a} أماكن لكل فرقة لا يمكن ملؤها — لا يوجد عدد كافٍ من الجنود إجمالاً.",
    recShortfallWarning: "يتوفر {a} رماة فقط لكل فرقة — المجمع أقل من الحد الأدنى المطلوب وهو {b}.",
    useInManual: "استخدم هذه الأرقام في وضع يدوي / كميات دقيقة", howThisWorks: "كيف يعمل هذا:",
    tieredStep1: "تمتلئ الفرق الأقوى أولاً — جميعها متطابقة مع بعضها.",
    tieredStep2: "تقسم الفرق الأضعف ما تبقى — وهي أيضًا متطابقة مع بعضها.",
    tieredStep3: "تحتفظ كل فرقة بقليل من المشاة والرماح، ثم تحمّل بالرماة لإحداث الضرر.",
    numberOfStrongerSquads: "عدد الفرق الأقوى", squadsStrongerWeaker: "الفرق من 1 إلى {a} هي الأقوى. الفرق من {b} إلى {c} هي الأضعف.",
    acceptableInfantryPerStronger: "المشاة المقبولون لكل فرقة أقوى",
    guaranteedStrongerFirst: "مضمونة أولاً في كل فرقة أقوى — تبقى بين 0.5% و3% من سعة الفرقة ({a}–{b}).",
    strongerSquadComposition: "تركيبة الفرقة الأقوى",
    onlyInfantryAvailableRequested: "يتوفر {a} مشاة فقط لكل فرقة (المطلوب {b}).",
    onlyMarksmanShortMinimum: "يتوفر {a} رماة فقط لكل فرقة — المجمع أقل من الحد الأدنى {b}.",
    minAcceptableMarksmanWeaker: "الحد الأدنى المقبول من الرماة لكل فرقة أضعف",
    guaranteedWeakerMinimum: "مضمون في كل فرقة أضعف — تتنازل الفرق الأقوى عن الرماة أولاً عند الحاجة. الحد الأدنى {a}.",
    weakerSquadComposition: "تركيبة الفرقة الأضعف",
    onlyMarksmanShortRequestedYield: "يتوفر {a} رماة فقط لكل فرقة — المجمع الإجمالي أقل من {b} المطلوب حتى بعد تنازل الفرق الأقوى.",
    clearedTroopsToast: "تم مسح الجنود.", resetToast: "تمت إعادة تعيين كل شيء.", undoAction: "تراجع",
    copyPlan: "نسخ خطة الفرق", copiedToast: "تم النسخ إلى الحافظة!", copyFailedToast: "تعذر النسخ — حاول مرة أخرى.",
    autoLabel: "تلقائي", marksmanBelow60kWarning: "أقل من الحد الأدنى 60,000",
    infantryStockLimitWarning: "لا يوجد مشاة كافون في مجمعك للزيادة أكثر", lancerStockLimitWarning: "لا يوجد رماح كافون في مجمعك للزيادة أكثر",
    scanScreenshotBtn: "📷 مسح لقطة شاشة بدلاً من ذلك", scanScreenshotHide: "إخفاء الماسح", screenshotLangLabel: "لغة لقطة الشاشة — يجب أن تطابق لغة واجهة اللعبة",
    chooseScreenshot: "اختر لقطة شاشة", scanBtn: "مسح لقطة الشاشة", scanningStatus: "قراءة الأرقام…", scanResultsHeading: "تحقق من الأرقام",
    needsReviewNote: "يحتاج مراجعة", applyToPoolBtn: "طبّق على مجمع الجنود", appliedScanToast: "تم تطبيق القيم الممسوحة على مجمع الجنود.",
    scanErrorMsg: "تعذّرت قراءة هذه الصورة — جرّب لقطة شاشة أوضح، أو أدخل الأرقام يدويًا أدناه.",
    scanHint: "يعمل بشكل أفضل مع لقطة واضحة وغير مقصوصة لشاشة معاينة الجنود.", whatScannerRead: "ما قرأه الماسح",
    notAnImage: "هذا لا يبدو كصورة — جرّب لقطة شاشة (PNG أو JPG).",
    scanInstructions: "داخل اللعبة، اضغط على صورة ملفك الشخصي (أعلى اليسار) ← الجنود ← تعرض تلك الشاشة أعداد جنودك. التقط لقطة شاشة لها ثم ارفعها أدناه.",
    scanRetryLangHint: "لم تتم قراءته جيدًا — جرّب لغة لقطة شاشة مختلفة أعلاه وامسح مرة أخرى.", rescanBtn: "🔁 مسح مرة أخرى",
    scanTotalFailure: "لم تنجح أي لغة من اللغات التي جُربت في قراءة هذه اللقطة. جرّب لقطة أوضح أو أقل ضغطًا، أو أدخل الأرقام يدويًا في الحقول أدناه.",
    scanCropHint: "يقرأ المسح فقط ما هو ظاهر أعلاه — مرّر لعرض الأرقام المطلوبة فقط، أو امسح قسمًا ثم مرّر وامسح مرة أخرى لإكمال الباقي.",
    hasHeliosLabel: "لدي جنود هيليوس (T11)",
    appliedScanToOtherToast: "تم تطبيق القيم الممسوحة على {a}.",
    autoDetectLangLabel: "اكتشاف لغة لقطة الشاشة تلقائيًا", detectedLangNote: "تم اكتشاف: {a}",
    alwaysDoubleCheckNote: "قد يُخطئ المسح الضوئي في قراءة أرقام فردية حتى لو بدا الحقل صحيحًا — قارن بلقطة الشاشة أعلاه قبل التطبيق.",
  },
};

function tType(type, lang) {
  const key = TYPE_LABEL_KEY[type];
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || TYPE_LABEL[type];
}
function tWord(key, lang) {
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
}
/* Same lookup as tWord, but substitutes {a}/{b}/{c} placeholders with the
   given values — for sentences that need numbers spliced into translated text. */
function tFmt(key, lang, vars = {}) {
  let str = tWord(key, lang);
  Object.keys(vars).forEach((k) => {
    str = str.split(`{${k}}`).join(vars[k]);
  });
  return str;
}

/* ============================================================
   HELPERS
   ============================================================ */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}
function toNonNegInt(v) {
  const n = parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  if (isNaN(n) || n < 0) return 0;
  return n;
}

/* ============================================================
   WATERCOLOR / HAND-DRAWN DECORATION — supporting elements only,
   kept low-opacity and outside the content column so they never
   reduce readability.
   ============================================================ */
function Snowflake({ size = 20, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <g stroke={C.cocoa} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.4">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="4" y1="7" x2="20" y2="17" />
        <line x1="20" y1="7" x2="4" y2="17" />
        <line x1="12" y1="3.5" x2="9.2" y2="6" />
        <line x1="12" y1="3.5" x2="14.8" y2="6" />
      </g>
    </svg>
  );
}

function PineTree({ width = 40, height = 54, style }) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 54" style={style} aria-hidden="true">
      <path d="M20 2 L29 19 L25 19 L33 33 L28 33 L36 48 L4 48 L12 33 L7 33 L15 19 L11 19 Z" fill={C.gold} opacity="0.28" />
      <rect x="17" y="47" width="6" height="6" fill={C.cocoa} opacity="0.28" rx="1.5" />
    </svg>
  );
}

/* Friendly bear-with-a-scarf mascot for the header — simple rounded shapes
   rather than a photographic illustration, matching the hand-drawn brief. */
function BearMascot({ size, className }) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={size ? { flexShrink: 0 } : undefined}
    >
      <circle cx="15" cy="16" r="8.5" fill={C.cocoa} />
      <circle cx="49" cy="16" r="8.5" fill={C.cocoa} />
      <circle cx="15" cy="16.5" r="4" fill={C.surface} />
      <circle cx="49" cy="16.5" r="4" fill={C.surface} />
      <circle cx="32" cy="35" r="21" fill={C.cocoa} />
      <ellipse cx="32" cy="40.5" rx="11.5" ry="8.5" fill={C.white} />
      <circle cx="32" cy="37" r="2.4" fill={C.cocoaDark} />
      <circle cx="24.5" cy="31" r="2.2" fill={C.cocoaDark} />
      <circle cx="39.5" cy="31" r="2.2" fill={C.cocoaDark} />
      <path d="M12 46 Q32 57 52 46 L52 52 Q32 62 12 52 Z" fill={C.goldStrong} />
    </svg>
  );
}

/* Small hand-painted brush-stroke accent, used behind section labels. */
function BrushUnderline({ width = 54, color = C.goldStrong }) {
  return (
    <svg width={width} height="8" viewBox="0 0 54 8" aria-hidden="true" style={{ display: "block" }}>
      <path d="M1 5.5 Q13 1.5 27 5 T53 4" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

/* Tent + campfire glow — decorative corner scene. */
function CampScene({ width = 110, height = 64, style }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 64" style={style} aria-hidden="true">
      <ellipse cx="26" cy="56" rx="22" ry="6" fill={C.goldStrong} opacity="0.14" />
      <path d="M20 56 Q26 36 32 56" fill="none" stroke={C.red} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <path d="M23 56 Q26 42 29 56" fill="none" stroke={C.goldStrong} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <polygon points="64,58 82,24 100,58" fill={C.surface} stroke={C.cocoa} strokeWidth="2" strokeLinejoin="round" opacity="0.5" />
      <polygon points="76,58 82,40 88,58" fill={C.cocoa} opacity="0.22" />
    </svg>
  );
}

/* Manual ratio/exact target (unchanged core logic). */
function computeTarget(capacity, mode, ratio, exact) {
  if (mode === "ratio") {
    const sum = ratio.infantry + ratio.lancer + ratio.marksman;
    const valid = Math.abs(sum - 100) < 0.001 && capacity > 0;
    if (!valid) return { valid: false, sum, mode: "ratio", infantry: 0, lancer: 0, marksman: 0 };
    const infantry = Math.round((capacity * ratio.infantry) / 100);
    const lancer = Math.round((capacity * ratio.lancer) / 100);
    const marksman = capacity - infantry - lancer; // remainder absorbs rounding
    return { valid: true, sum, mode: "ratio", infantry, lancer, marksman: Math.max(0, marksman) };
  } else {
    const total = exact.infantry + exact.lancer + exact.marksman;
    const valid = total === capacity && capacity > 0;
    return { valid, total, mode: "exact", infantry: exact.infantry, lancer: exact.lancer, marksman: exact.marksman };
  }
}

const DIVERSITY_FLOOR = 1; // every squad always carries at least this much of each troop type
const MIN_JOINER_MARKSMAN = 60000; // Recommended's hard warning threshold — the one non-negotiable floor
const MAX_JOINER_INFANTRY_PCT = 0.03; // Infantry is capped at 3% of squad capacity
const MIN_JOINER_INFANTRY_PCT = 0.005; // ...and floored at 0.5% of squad capacity, stock permitting
const MIN_JOINER_LANCER_PCT = 0.10; // Lancer's default/starting slider position (Ton Ton's ratio)
const MAX_JOINER_LANCER_UI_PCT = 0.30; // Lancer slider's ceiling — dragging past the safe zone just warns, doesn't block

/* Builds a per-squad target that (1) guarantees each type's floor first —
   capped by what `divisor` squads can actually draw from the pool — then
   (2) spends whatever capacity is left over. By default only Marksman (and
   only Marksman) absorbs that leftover, honoring an optional per-type
   `caps` ceiling (e.g. Infantry never exceeding 3% of capacity) — Infantry
   and Lancer never receive more than their floor asked for, and if
   Marksman's own stock can't cover the rest either, the squad is left
   Partial rather than the leftover spilling into Lancer or Infantry and
   blowing past their intended ratio. Used for the Recommended strategy so
   floors/caps are real, guaranteed constraints rather than a post-hoc
   warning.
   Passing `spillOrder` (e.g. ["marksman","lancer","infantry"]) switches to
   Ton Ton's priority-fill behavior instead: leftover capacity cascades
   through that order, each type still capped by its own stock (and `caps`,
   if given), so a squad fills as completely as the total pool allows even
   when that means drifting from the ideal ratio. Used by Auto Split, where
   filling the march completely matters more than a perfect ratio. */
function priorityTargetWithFloors(capacity, available, divisor, floors, caps = {}, spillOrder = null) {
  if (!capacity || capacity <= 0 || !divisor || divisor <= 0) {
    return { infantry: 0, lancer: 0, marksman: 0, valid: false, shortfall: 0, floorsMet: { infantry: true, lancer: true, marksman: true } };
  }
  const maxByStock = {};
  TYPES.forEach((t) => (maxByStock[t] = Math.floor((available[t] || 0) / divisor)));

  const result = {};
  let remaining = capacity;
  const floorsMet = {};
  TYPES.forEach((t) => {
    const want = Math.max(0, floors[t] || 0);
    const capLimit = caps[t] !== undefined ? caps[t] : Infinity;
    const give = Math.min(want, maxByStock[t], remaining, capLimit);
    result[t] = give;
    remaining -= give;
    floorsMet[t] = give >= want;
  });

  if (spillOrder) {
    spillOrder.forEach((t) => {
      if (remaining <= 0) return;
      const capLimit = caps[t] !== undefined ? caps[t] : Infinity;
      const extra = Math.max(0, Math.min(maxByStock[t], capLimit) - result[t]);
      const use = Math.min(extra, remaining);
      result[t] += use;
      remaining -= use;
    });
  } else if (remaining > 0) {
    const capLimit = caps.marksman !== undefined ? caps.marksman : Infinity;
    const extra = Math.max(0, Math.min(maxByStock.marksman, capLimit) - result.marksman);
    const use = Math.min(extra, remaining);
    result.marksman += use;
    remaining -= use;
  }

  return { infantry: result.infantry, lancer: result.lancer, marksman: result.marksman, valid: true, shortfall: Math.max(0, remaining), floorsMet };
}

// Troop tiers, strongest to weakest — always tried in this exact order
// regardless of whether a player has Helios (T11) troops; when they don't,
// t11's pool simply stays at zero (the field is hidden, never edited), so
// nothing about this order needs to change based on who has what.
const TIERS = ["t11", "t10", "t9"];

/* Allocate ONE squad's target against shared pools, then apply accepted
   manual fills, then compute fresh fill suggestions for any leftover space. */
function allocateSquad(capacity, target, pools, acceptedFills = []) {
  const breakdown = {};
  let totalAllocated = 0;

  TYPES.forEach((t) => {
    const want = target[t] || 0;
    let stillWant = want;
    const alloc = {};
    TIERS.forEach((tier) => {
      const use = Math.min(stillWant, pools[tier][t]);
      pools[tier][t] -= use;
      alloc[tier] = use;
      stillWant -= use;
    });
    const total = TIERS.reduce((s, tier) => s + alloc[tier], 0);
    breakdown[t] = { target: want, ...alloc, total, shortage: Math.max(0, want - total) };
    totalAllocated += total;
  });

  let capacityRemaining = Math.max(0, capacity - totalAllocated);

  const appliedFills = [];
  acceptedFills.forEach((fill) => {
    if (capacityRemaining <= 0) {
      appliedFills.push({ ...fill, applied: 0 });
      return;
    }
    const use = Math.max(0, Math.min(fill.amount, pools[fill.tier][fill.type], capacityRemaining));
    if (use > 0) {
      breakdown[fill.type][fill.tier] += use;
      breakdown[fill.type].total += use;
      pools[fill.tier][fill.type] -= use;
      totalAllocated += use;
      capacityRemaining -= use;
    }
    appliedFills.push({ ...fill, applied: use });
  });

  let status = "full";
  if (totalAllocated < capacity) status = "partial";

  const suggestions = [];
  if (capacityRemaining > 0) {
    let remaining = capacityRemaining;
    for (const tier of TIERS) {
      for (const t of FILL_ORDER) {
        if (remaining <= 0) break;
        const avail = pools[tier][t];
        if (avail > 0) {
          const use = Math.min(avail, remaining);
          suggestions.push({ tier, type: t, amount: use });
          remaining -= use;
        }
      }
      if (remaining <= 0) break;
    }
  }

  const tierPct = {};
  TIERS.forEach((tier) => {
    const used = TYPES.reduce((s, t) => s + breakdown[t][tier], 0);
    tierPct[`${tier}Pct`] = totalAllocated > 0 ? (used / totalAllocated) * 100 : 0;
  });

  return {
    breakdown,
    totalAllocated,
    capacityRemaining,
    status,
    suggestions,
    appliedFills,
    pctOf: (n) => (totalAllocated > 0 ? (n / totalAllocated) * 100 : 0),
    ...tierPct,
  };
}

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function SectionHeader({ title, sub, step }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {step && (
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              background: C.goldStrong,
              color: C.cocoaDark,
              fontSize: 12.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(110,75,55,0.28)",
            }}
          >
            {step}
          </span>
        )}
        <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, letterSpacing: 0.1 }}>{title}</div>
      </div>
      <div style={{ marginTop: 4, marginLeft: step ? 36 : 0 }}>
        <BrushUnderline color={C.goldBorder} />
      </div>
      {sub && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 6, marginLeft: step ? 36 : 0, fontWeight: 400 }}>{sub}</div>}
    </div>
  );
}
function Card({ children, style }) {
  return (
    <div className="calc-card" style={style}>
      {children}
    </div>
  );
}
/* Holds its own local text so the field can go genuinely empty while typing
   (e.g. backspacing to clear it) instead of snapping back to "0" on every
   keystroke. Re-syncs from the external value only when that value changed
   for a reason other than this field's own typing (Reset, clamping, etc). */
function NumField({ label, value, onChange }) {
  const [text, setText] = useState(() => fmt(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(fmt(value));
      lastEmitted.current = value;
    }
  }, [value]);

  function handleChange(e) {
    const cleaned = e.target.value.replace(/[^0-9]/g, "");
    setText(cleaned);
    const parsed = cleaned === "" ? 0 : toNonNegInt(cleaned);
    lastEmitted.current = parsed;
    onChange(parsed);
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 100 }}>
      <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, fontWeight: 800, color: C.gold }}>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={text}
        onChange={handleChange}
        onBlur={() => setText(fmt(value))}
        className="calc-input"
      />
    </label>
  );
}

/* Typed percentage entry — independent per field, no artificial clamping
   while typing; the total-must-equal-100% check happens separately below.
   Same local-text pattern as NumField so backspacing to empty works. */
function PctField({ label, value, onChange, colorDot }) {
  const [text, setText] = useState(() => String(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(String(value));
      lastEmitted.current = value;
    }
  }, [value]);

  function handleChange(e) {
    const cleaned = e.target.value.replace(/[^0-9]/g, "");
    setText(cleaned);
    const parsed = cleaned === "" ? 0 : toNonNegInt(cleaned);
    lastEmitted.current = parsed;
    onChange(parsed);
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 90 }}>
      <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, fontWeight: 800, color: C.gold, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: colorDot, display: "inline-block" }} />
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={text}
          onChange={handleChange}
          onBlur={() => setText(String(value))}
          className="calc-input"
          style={{ paddingRight: 30 }}
        />
        <span style={{ position: "absolute", right: 12, top: 13, color: C.sub, fontWeight: 700, fontSize: 13 }}>%</span>
      </div>
    </label>
  );
}

/* A labeled range slider for adjusting a ratio, with the live value shown
   large next to the label so it's obvious what dragging it does. */
/* A labeled range slider for adjusting a ratio. The track fills in behind
   the thumb as it moves (a visible progress bar, not just a plain groove)
   so it reads as "drag this" at a glance, without needing instructions. */
function RatioSlider({ label, colorDot, value, min, max, step, onChange, suffix = "%", warningEmoji, warningText }) {
  const span = Math.max(max - min, 0.0001);
  const pct = Math.min(100, Math.max(0, ((value - min) / span) * 100));
  const trackBg = `linear-gradient(to right, ${colorDot} 0%, ${colorDot} ${pct}%, var(--tierTrackBg) ${pct}%, var(--tierTrackBg) 100%)`;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: C.gold }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: colorDot, display: "inline-block" }} />
          {label}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {warningEmoji && (
            <span title={warningText} style={{ fontSize: 15, cursor: "help" }}>
              {warningEmoji}
            </span>
          )}
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: C.cocoaDark,
              background: colorDot,
              padding: "3px 12px",
              borderRadius: 999,
              minWidth: 52,
              textAlign: "center",
            }}
          >
            {value}{suffix}
          </span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ratio-slider"
        style={{ background: trackBg }}
        aria-label={label}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10.5, color: C.sub, fontWeight: 600 }}>{min}{suffix}</span>
        <span style={{ fontSize: 10.5, color: C.sub, fontWeight: 600 }}>{max}{suffix}</span>
      </div>
      {warningEmoji && warningText && (
        <div style={{ fontSize: 11, color: C.amber, fontWeight: 600, marginTop: 5 }}>
          {warningEmoji} {warningText}
        </div>
      )}
    </div>
  );
}

/* A read-only bar showing Marksman's share moving live as the sliders above
   change — deliberately NOT an <input type="range">, with a muted "auto"
   tag and a not-allowed cursor, so it never reads as something you can drag. */
function AutoRatioBar({ label, colorDot, pct, displayValue, autoLabel, warningEmoji, warningText }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const barColor = warningEmoji ? C.amber : colorDot;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: C.gold }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: colorDot, display: "inline-block" }} />
          {label}
          <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, background: "var(--tierTrackBg)", borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
            🔒 {autoLabel}
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {warningEmoji && (
            <span title={warningText} style={{ fontSize: 15, cursor: "help" }}>
              {warningEmoji}
            </span>
          )}
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: C.cocoaDark,
              background: barColor,
              padding: "3px 12px",
              borderRadius: 999,
              minWidth: 52,
              textAlign: "center",
            }}
          >
            {displayValue}
          </span>
        </span>
      </div>
      <div
        style={{ height: 12, borderRadius: 999, background: "var(--tierTrackBg)", overflow: "hidden", cursor: "not-allowed" }}
        aria-hidden="true"
      >
        <div style={{ height: "100%", width: `${clamped}%`, background: barColor, borderRadius: 999, transition: "width 150ms ease" }} />
      </div>
      {warningEmoji && warningText && (
        <div style={{ fontSize: 11, color: C.amber, fontWeight: 600, marginTop: 5 }}>
          {warningEmoji} {warningText}
        </div>
      )}
    </div>
  );
}

/* Stacked bar preview of a composition — visualizes the ratio at a glance. */
function CompositionBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.pct, 0);
  const gap = Math.max(0, 100 - total);
  return (
    <div style={{ display: "flex", height: 14, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.cardBorder}`, marginTop: 10 }}>
      {segments.map((s, i) => s.pct > 0 && <div key={i} style={{ width: `${Math.min(s.pct, 100)}%`, background: s.color, transition: "width 120ms ease" }} />)}
      {gap > 0 && <div style={{ width: `${gap}%`, background: "var(--progressTrackBg)" }} />}
    </div>
  );
}

function TroopChip({ label, value, color, strong }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: strong ? C.goldBg : "var(--neutralChipBg)",
        border: `1px solid ${strong ? C.goldBorder : C.cardBorder}`,
        borderRadius: 999,
        padding: "7px 13px",
        fontSize: 12,
        fontWeight: 600,
        color: strong ? C.gold : C.ink,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color, display: "inline-block", flexShrink: 0 }} />
      {label}: {fmt(value)}
    </div>
  );
}

function Pill({ children, tone, icon }) {
  const map = {
    green: [C.greenBg, C.green],
    amber: [C.amberBg, C.amber],
    red: [C.redBg, C.red],
    gold: [C.goldBg, C.gold],
    t9: [C.statusT9Bg, C.statusT9Text],
    neutral: ["var(--neutralChipBg)", C.sub],
  };
  const [bg, fg] = map[tone] || map.neutral;
  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontFamily: "'Nunito Sans', sans-serif",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: "14px",
        padding: "4px 9px",
        minHeight: 24,
        borderRadius: 999,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        boxSizing: "border-box",
      }}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

function Btn({ children, onClick, tone = "primary", small }) {
  const styles = {
    primary: { background: C.gold, color: C.surface, border: "none", boxShadow: "0 3px 0 var(--btnPrimaryShadow)" }, // pine — selected / confirmation state
    ghost: { background: "var(--btnSecondaryBg)", color: C.gold, border: "1px solid var(--btnSecondaryBorder)", boxShadow: "none" }, // button-secondary
    danger: { background: C.redBg, color: C.red, border: "none", boxShadow: "none" }, // button-danger
    gold: { background: C.goldStrong, color: C.cocoaDark, border: "none", boxShadow: "0 3px 0 var(--btnGoldShadow)" }, // button-primary (amber) — forward-moving actions
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[tone],
        borderRadius: 12,
        padding: small ? "9px 14px" : "10px 15px",
        fontFamily: "'Nunito Sans', sans-serif",
        fontWeight: 800,
        fontSize: small ? 12.5 : 14,
        lineHeight: "18px",
        letterSpacing: 0.1,
        cursor: "pointer",
        flex: small ? "0 0 auto" : "1 1 auto",
        minHeight: small ? 36 : 42,
      }}
    >
      {children}
    </button>
  );
}

/* Small readonly composition chip row, used by Recommended / Tiered cards */
function TargetPreview({ target, lang }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {TYPES.map((t) => (
        <div key={t}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: C.gold, textTransform: "uppercase", letterSpacing: 0.3 }}>{tType(t, lang)}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{fmt(target[t])}</div>
        </div>
      ))}
    </div>
  );
}

/* Slim progress bar showing how full a squad is against its capacity. */
function ProgressBar({ pct, tone }) {
  const color = tone === "green" ? C.green : tone === "amber" ? C.amber : C.sub;
  const bg = tone === "green" ? C.greenBg : tone === "amber" ? C.amberBg : "var(--progressTrackBg)";
  return (
    <div style={{ height: 7, borderRadius: 999, background: bg, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999, transition: "width 150ms ease" }} />
    </div>
  );
}

/* ============================================================
   SQUAD CARD
   ============================================================ */
function SquadCard({ index, squadKey, result, invalid, onAcceptFill, onRemoveFill, tierLabel, lang }) {
  if (invalid) {
    return (
      <Card style={{ borderColor: C.red, background: C.redBg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600, color: C.gold }}>{tWord("squadLabel", lang)} {index}</div>
          <Pill tone="red" icon="✕">{tWord("invalidTarget", lang)}</Pill>
        </div>
        <div style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>{tWord("fixComposition", lang)}</div>
      </Card>
    );
  }

  const isFull = result.status === "full";
  const tone = isFull ? "green" : "amber";
  const borderColor = isFull ? "var(--squadFullBorder)" : "var(--squadPartialBorder)";
  const bg = isFull ? C.greenBg : C.amberBg;
  const tierAccent = tierLabel === "stronger" ? C.gold : tierLabel === "weaker" ? TYPE_COLOR.lancer : null;
  const fillPct = result.totalAllocated > 0 || result.capacityRemaining > 0 ? (result.totalAllocated / (result.totalAllocated + result.capacityRemaining)) * 100 : 0;
  const t9Used = TYPES.reduce((s, t) => s + result.breakdown[t].t9, 0);
  const usesT9 = t9Used > 0;

  return (
    <Card style={{ borderColor, borderLeft: tierAccent ? `4px solid ${tierAccent}` : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 600, color: C.ink, fontSize: 15.5 }}>
          {index === "Leader" ? tWord("leaderLabel", lang) : `${tWord("squadLabel", lang)} ${index}`} {tierLabel && <span style={{ fontSize: 10.5, fontWeight: 500, color: C.sub, textTransform: "uppercase", marginLeft: 6 }}>{tWord(tierLabel === "stronger" ? "strongerLabel" : "weakerLabel", lang)}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {usesT9 && <Pill tone="t9" icon="⇄">{tWord("usesT9Pill", lang)}</Pill>}
          <Pill tone={tone} icon={isFull ? "✓" : "⚠"}>{isFull ? tWord("fullPill", lang) : tWord("partialPill", lang)}</Pill>
        </div>
      </div>

      <ProgressBar pct={fillPct} tone={tone} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: C.ink, marginTop: 7, marginBottom: 16 }}>
        <span>{fmt(result.totalAllocated)} / {fmt(result.totalAllocated + result.capacityRemaining)}</span>
        <span style={{ color: result.capacityRemaining > 0 ? C.amber : C.green }}>
          {result.capacityRemaining > 0 ? `${fmt(result.capacityRemaining)} ${tWord("openLabel", lang)}` : tWord("atCapacityLabel", lang)}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {TYPES.map((t) => {
          const b = result.breakdown[t];
          const t11Pct = b.total > 0 ? (b.t11 / b.total) * 100 : 0;
          const t10Pct = b.total > 0 ? (b.t10 / b.total) * 100 : 0;
          const t9Pct = b.total > 0 ? (b.t9 / b.total) * 100 : 0;
          return (
            <div key={t} style={{ background: C.surface, border: `1.5px solid ${b.t9 > 0 ? C.t9Amber : C.cardBorder}`, borderRadius: 14, padding: "11px 9px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: 0.3 }}>{tType(t, lang)}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{fmt(b.total)}</div>
              {b.total > 0 && (
                <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginTop: 6, marginBottom: 6, background: "var(--tierTrackBg)" }}>
                  {b.t11 > 0 && <div style={{ width: `${t11Pct}%`, background: C.green }} />}
                  {b.t10 > 0 && <div style={{ width: `${t10Pct}%`, background: C.teal }} />}
                  {b.t9 > 0 && <div style={{ width: `${t9Pct}%`, background: C.t9Amber }} />}
                </div>
              )}
              <div style={{ fontSize: 10.5 }}>
                {b.t11 > 0 && (
                  <>
                    <span style={{ color: C.green, fontWeight: 700 }}>T11 {fmt(b.t11)}</span>
                    <span style={{ color: C.sub }}> · </span>
                  </>
                )}
                <span style={{ color: b.t10 > 0 ? C.teal : C.sub, fontWeight: b.t10 > 0 ? 700 : 400 }}>T10 {fmt(b.t10)}</span>
                <span style={{ color: C.sub }}> · </span>
                <span style={{ color: b.t9 > 0 ? C.t9Amber : C.sub, fontWeight: b.t9 > 0 ? 700 : 400 }}>T9 {fmt(b.t9)}</span>
              </div>
              {b.shortage > 0 && <div style={{ fontSize: 10.5, color: C.red, fontWeight: 600, marginTop: 2 }}>{tWord("shortLabel", lang)} {fmt(b.shortage)}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>
        {tWord("compLabel", lang)}: {result.pctOf(result.breakdown.infantry.total).toFixed(1)}% {tWord("infAbbr", lang)} · {result.pctOf(result.breakdown.lancer.total).toFixed(1)}% {tWord("lanAbbr", lang)} ·{" "}
        {result.pctOf(result.breakdown.marksman.total).toFixed(1)}% {tWord("markAbbr", lang)} &nbsp;|&nbsp; {result.t11Pct > 0 ? `T11 ${result.t11Pct.toFixed(0)}% / ` : ""}T10 {result.t10Pct.toFixed(0)}% / T9 {result.t9Pct.toFixed(0)}%
      </div>

      {result.remainingAfter && (
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 10, background: "var(--tierTrackBg)", borderRadius: 10, padding: "6px 10px" }}>
          {tWord("remainingAfterLabel", lang)}: {tType("infantry", lang)} {fmt(result.remainingAfter.infantry)} · {tType("lancer", lang)} {fmt(result.remainingAfter.lancer)} · {tType("marksman", lang)} {fmt(result.remainingAfter.marksman)}
        </div>
      )}

      {result.appliedFills && result.appliedFills.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {result.appliedFills.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: "6px 6px 6px 10px", fontSize: 11.5 }}>
              <span style={{ color: C.gold, fontWeight: 600 }}>+ {fmt(f.applied)} {f.tier.toUpperCase()} {tType(f.type, lang)} {tWord("addedManually", lang)}</span>
              <button onClick={() => onRemoveFill(squadKey, i)} aria-label="Remove this manual fill" style={{ background: "none", border: "none", color: C.red, fontWeight: 600, cursor: "pointer", fontSize: 15, padding: "6px 8px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {result.capacityRemaining > 0 && (
        <div style={{ background: bg, borderRadius: 14, padding: "10px 12px", fontSize: 12, color: C.ink }}>
          <div style={{ fontWeight: 600, marginBottom: 7 }}>{tWord("fillRemaining", lang)} {fmt(result.capacityRemaining)}:</div>
          {result.suggestions.length === 0 ? (
            <div style={{ color: C.red, fontWeight: 500 }}>{tWord("noTroopsLeftPool", lang)}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.suggestions.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>{fmt(s.amount)} {s.tier.toUpperCase()} {tType(s.type, lang)} {tWord("availableWord", lang)}</span>
                  <Btn tone="gold" small onClick={() => onAcceptFill(squadKey, s.tier, s.type, s.amount)}>{tWord("addBtn", lang)}</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   MANUAL COMPOSITION INPUTS (sliders / exact, reused for rally leader)
   ============================================================ */
function CompositionInputs({ capacity, mode, setMode, ratio, setRatio, exact, setExact, target, lang }) {
  const dots = TYPE_COLOR;
  const ratioSum = ratio.infantry + ratio.lancer + ratio.marksman;

  // Typed entry — each field is independent and only capped at 100 on its
  // own; the three summing to 100% is checked and reported separately below.
  function handleRatioChange(type, val) {
    setRatio({ ...ratio, [type]: Math.min(100, Math.max(0, val)) });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Btn tone={mode === "ratio" ? "primary" : "ghost"} onClick={() => setMode("ratio")}>{tWord("percentages", lang)}</Btn>
        <Btn tone={mode === "exact" ? "primary" : "ghost"} onClick={() => setMode("exact")}>{tWord("exactAmounts", lang)}</Btn>
      </div>

      {mode === "ratio" ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TYPES.map((t) => (
              <PctField key={t} label={tType(t, lang)} value={ratio[t]} colorDot={dots[t]} onChange={(v) => handleRatioChange(t, v)} />
            ))}
          </div>
          <CompositionBar segments={TYPES.map((t) => ({ pct: ratio[t], color: dots[t] }))} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 500 }}>{tWord("remainingToAllocate", lang)}: {Math.max(0, 100 - ratioSum)}%</span>
            {!target.valid ? (
              <span style={{ fontSize: 12, color: C.red, fontWeight: 500 }}>✕ {tWord("totalWord", lang)} {ratioSum.toFixed(0)}% — {tWord("mustEqual100", lang)}</span>
            ) : (
              <span style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>✓ {tWord("totals100", lang)}</span>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NumField label={tType("infantry", lang)} value={exact.infantry} onChange={(v) => setExact({ ...exact, infantry: v })} />
            <NumField label={tType("lancer", lang)} value={exact.lancer} onChange={(v) => setExact({ ...exact, lancer: v })} />
            <NumField label={tType("marksman", lang)} value={exact.marksman} onChange={(v) => setExact({ ...exact, marksman: v })} />
          </div>
          {!target.valid && (
            <div style={{ marginTop: 8, fontWeight: 500, fontSize: 12.5, color: target.total < capacity ? C.amber : C.red }}>
              {target.total < capacity ? tFmt("spacesRemainingBelow", lang, { a: fmt(capacity - target.total) }) : tFmt("exceedsCapacityBy", lang, { a: fmt(target.total - capacity) })}
            </div>
          )}
        </>
      )}

      {target.valid && (
        <div style={{ marginTop: 12, background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10 }}>
          <TargetPreview target={target} lang={lang} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SCREENSHOT SCANNER — reads T10/T9 troop counts straight out of
   a Troops Preview screenshot via on-device OCR (Tesseract.js,
   loaded on demand — nothing is ever uploaded anywhere) and hands
   them to the Troop Pool fields above. Adapted from a standalone
   scanner tool: the actual OCR word-position matching carries
   over faithfully, but its separate history/export/theme system
   is dropped, since this app already has its own account-based
   persistence and look — duplicating either would just create two
   competing sources of truth.
   ============================================================ */
let tesseractLoadPromise = null;
function loadTesseract() {
  if (typeof window !== "undefined" && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadPromise) return tesseractLoadPromise;
  tesseractLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("Failed to load OCR engine"));
    document.head.appendChild(script);
  });
  return tesseractLoadPromise;
}

// The screenshot's language is independent of the app's display language —
// the scanner defaults to English and lets the player switch + rescan.
const OCR_LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "chi_tra", label: "Chinese (Traditional)" },
  { code: "ara", label: "Arabic" },
  { code: "deu", label: "German" },
  { code: "spa", label: "Spanish" },
  { code: "ita", label: "Italian" },
  { code: "kor", label: "Korean" },
  { code: "pol", label: "Polish" },
  { code: "rus", label: "Russian" },
  { code: "tur", label: "Turkish" },
];

const SCAN_FIELDS = [
  { key: "t11Infantry", tier: "t11", type: "infantry" },
  { key: "t11Lancer", tier: "t11", type: "lancer" },
  { key: "t11Marksman", tier: "t11", type: "marksman" },
  { key: "t10Infantry", tier: "t10", type: "infantry" },
  { key: "t10Lancer", tier: "t10", type: "lancer" },
  { key: "t10Marksman", tier: "t10", type: "marksman" },
  { key: "t9Infantry", tier: "t9", type: "infantry" },
  { key: "t9Lancer", tier: "t9", type: "lancer" },
  { key: "t9Marksman", tier: "t9", type: "marksman" },
];
const SCAN_CONF_THRESHOLD = 70;
// Tesseract.js has no cheap, genuine "detect the language before reading"
// step — auto-detect here means running a full OCR pass with each of these
// languages in turn and keeping whichever one scores highest by total
// confidence across all 6 fields (so a language that reads everything
// cleanly beats one that also finds everything but shakily). Kept short on
// purpose: every entry is a full pass (plus its own language data download
// the first time), so a long list would make "auto" feel slow.
// chi_sim is tried FIRST deliberately, not because the game text is
// Chinese — it's an English-language game — but because Tesseract's
// Chinese Simplified model has empirically read this game's bold,
// stylized custom font (numbers included) more reliably than its own
// English model does. This is about which trained model best tolerates
// the font rendering, not about matching the game's actual UI language.
const AUTO_DETECT_SEQUENCE = ["chi_sim", "eng", "ara", "rus"];

// Pull every OCR *word* (not line) out of the blocks→paragraphs→lines tree,
// with its bounding box and Tesseract's own confidence. Word level matters
// because two on-screen columns often get merged into one wide OCR line —
// word boxes stay accurate even when the line grouping doesn't.
// A word's overall confidence is an average across its characters — which
// means ONE misread digit inside an otherwise-clean number can hide behind
// a perfectly decent word-level score. Tesseract.js exposes per-character
// ("symbol") confidence too; using the LOWEST symbol confidence in the word
// (when available) instead of the averaged word confidence means a single
// bad digit correctly drags the whole field down to "needs review," rather
// than a confidently-wrong number slipping through untouched.
function flattenWords(data) {
  const words = [];
  function collect(lines) {
    (lines || []).forEach((line) => {
      (line.words || []).forEach((w) => {
        if (w.text && w.bbox) {
          let conf = typeof w.confidence === "number" ? w.confidence : 100;
          if (w.symbols && w.symbols.length) {
            w.symbols.forEach((s) => {
              if (typeof s.confidence === "number" && s.confidence < conf) conf = s.confidence;
            });
          }
          words.push({ text: w.text.trim(), bbox: w.bbox, confidence: conf });
        }
      });
    });
  }
  if (data.blocks && data.blocks.length) {
    data.blocks.forEach((block) => (block.paragraphs || []).forEach((para) => collect(para.lines)));
  }
  if (!words.length && data.lines) collect(data.lines);
  if (!words.length && data.paragraphs) data.paragraphs.forEach((p) => collect(p.lines));
  return words.filter((w) => w.text);
}

// Pulls a usable digit run out of a word even when OCR glued noise onto it
// ("P6615") or misread a comma as a period ("6.615") — separators are
// always stripped rather than trusted.
function extractDigits(text) {
  const matches = text.match(/\d[\d.,]*\d|\d{2,}/g);
  if (!matches) return null;
  const candidates = matches.map((m) => ({ raw: m, digits: m.replace(/[.,]/g, "") })).filter((c) => c.digits.length >= 4);
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.digits.length - a.digits.length);
  return candidates[0];
}
function isNumberWord(text) {
  return extractDigits(text) !== null;
}
function ocrCenterX(b) { return (b.x0 + b.x1) / 2; }
function ocrCenterY(b) { return (b.y0 + b.y1) / 2; }

function nearestNumberBelow(labelWord, numberWords) {
  const lcx = ocrCenterX(labelWord.bbox);
  const candidates = numberWords.filter((n) => n.bbox.y0 >= labelWord.bbox.y1 - 10);
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const score = (n) => Math.abs(n.bbox.y0 - labelWord.bbox.y1) * 1.5 + Math.abs(ocrCenterX(n.bbox) - lcx);
    return score(a) - score(b);
  });
  const best = candidates[0];
  const d = extractDigits(best.text);
  return { value: parseInt(d.digits, 10), confidence: best.confidence, raw: best.text };
}

// "T11"/"T10"/"T9" (Helios/Apex/Supreme) read unreliably via OCR since icons
// crowd the text, but "Infantry"/"Lancer"/"Marksman" read cleanly. The
// screen always lists rows strongest-tier-first for a given type, so
// rather than reading the tier word itself, each type's occurrences get
// sorted top-to-bottom and labeled by however many rows actually turned
// up: 2 rows (the common case) means T10/T9 exactly as always; a genuine
// 3rd row above those two means Helios is present and becomes T11 — never
// assumed, only detected when it's actually there.
function assignByPosition(words) {
  const numberWords = words.filter((w) => isNumberWord(w.text));
  const result = {};
  const tiersForCount = { 1: ["t10"], 2: ["t10", "t9"], 3: ["t11", "t10", "t9"] };
  TYPES.forEach((type) => {
    const matches = words.filter((w) => w.text.toLowerCase().indexOf(type) !== -1);
    matches.sort((a, b) => {
      const dy = ocrCenterY(a.bbox) - ocrCenterY(b.bbox);
      if (Math.abs(dy) > 20) return dy;
      return ocrCenterX(a.bbox) - ocrCenterX(b.bbox);
    });
    const cap = type.charAt(0).toUpperCase() + type.slice(1);
    const tierOrder = tiersForCount[Math.min(matches.length, 3)] || [];
    matches.slice(0, 3).forEach((labelWord, idx) => {
      if (!tierOrder[idx]) return;
      result[tierOrder[idx] + cap] = nearestNumberBelow(labelWord, numberWords);
    });
  });
  return result;
}

function lineHasKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.every((kw) => lower.indexOf(kw) !== -1);
}

// Fallback for when a field wasn't found by word position: plain sequential
// text search. Lower confidence, since it skips the position cross-check.
function findValueForFieldFallback(rawText, keywords) {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (lineHasKeywords(lines[i], keywords)) {
      for (let j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
        const d = extractDigits(lines[j]);
        if (d) return parseInt(d.digits, 10);
      }
    }
  }
  return null;
}

function parseScanText(data) {
  const words = flattenWords(data);
  const assigned = words.length ? assignByPosition(words) : {};
  const values = {};
  const confidence = {};
  SCAN_FIELDS.forEach((f) => {
    const r = assigned[f.key];
    if (r) {
      values[f.key] = r.value;
      confidence[f.key] = r.confidence;
    } else {
      const fb = findValueForFieldFallback(data.text || "", [f.type]);
      values[f.key] = fb;
      confidence[f.key] = fb === null ? null : 50;
    }
  });
  return { values, confidence, rawText: data.text || "" };
}

// Crops to nothing (whole image) but upscales before handing it to
// Tesseract — small, compressed screenshot text reads far more reliably at
// 2x than at native resolution.
//
// Tried and reverted: a grayscale + contrast-boost canvas filter before OCR
// (a standard preprocessing trick) and a 3x upscale. Real test against this
// game's actual UI made results measurably WORSE — a scan that previously
// still extracted digit-like text (even if some digits were wrong) came
// back with no numbers found at all after that change. Whatever's specific
// to this font/background combination, flattening color and boosting
// contrast apparently destroys information the OCR model needs rather than
// removing noise. Leaving this note so a future "let's try preprocessing
// again" doesn't repeat the same regression blind.
const OCR_UPSCALE_FACTOR = 2;
const OCR_MAX_DIMENSION = 3200;
// `crop` (in the source image's own natural pixel coordinates) lets a
// caller OCR only part of the image — used so the scanner reads only
// whatever's actually scrolled into view in the preview, not the whole
// screenshot every time.
function buildOcrCanvas(imgEl, crop) {
  const sx = crop ? crop.sx : 0;
  const sy = crop ? crop.sy : 0;
  const sw = crop ? crop.sw : imgEl.naturalWidth;
  const sh = crop ? crop.sh : imgEl.naturalHeight;
  let destW = sw * OCR_UPSCALE_FACTOR, destH = sh * OCR_UPSCALE_FACTOR;
  if (Math.max(destW, destH) > OCR_MAX_DIMENSION) {
    const shrink = OCR_MAX_DIMENSION / Math.max(destW, destH);
    destW *= shrink;
    destH *= shrink;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(destW));
  canvas.height = Math.max(1, Math.round(destH));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function ScreenshotScanner({ lang, accounts, activeAccountId, onApply }) {
  const [open, setOpen] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [scanLang, setScanLang] = useState("chi_sim"); // default guess — Tesseract's Chinese Simplified model has proven the most reliable reader of this game's font, even for English screenshots; easy to change and rescan if it misreads
  const [imgSrc, setImgSrc] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanPct, setScanPct] = useState(0);
  const [confidence, setConfidence] = useState({});
  const [rawText, setRawText] = useState("");
  const [scannedValues, setScannedValues] = useState(null); // immutable snapshot of the OCR result, for the debug panel — edited (below) can drift from this as the player corrects fields
  const [edited, setEdited] = useState(null); // { t10Infantry, t10Lancer, ... } once a scan has run — the player's editable copy
  const [hasScanned, setHasScanned] = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const imgRef = useRef(null);
  const scrollWrapRef = useRef(null);

  function handleFile(file) {
    setFileError(null);
    if (!file.type || file.type.indexOf("image/") !== 0) {
      setFileError(tWord("notAnImage", lang));
      return;
    }
    setEdited(null);
    setScannedValues(null);
    setHasScanned(false);
    setRawText("");
    setConfidence({});
    setDetectedLang(null);
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target.result);
    reader.onerror = () => setFileError(tWord("notAnImage", lang));
    reader.readAsDataURL(file);
  }

  // OCR reads only whatever's currently scrolled into view in the preview,
  // not the whole screenshot — computed here in the source image's own
  // natural pixel coordinates from the scroll wrapper's current position.
  function computeVisibleCrop() {
    const wrap = scrollWrapRef.current;
    const imgEl = imgRef.current;
    if (!wrap || !imgEl || !imgEl.naturalWidth || !wrap.clientWidth) return null;
    const scale = imgEl.naturalWidth / wrap.clientWidth; // image is width:100% of wrap, so this is the display→natural scale factor
    const sy = Math.max(0, wrap.scrollTop * scale);
    const sh = Math.max(1, Math.min(imgEl.naturalHeight - sy, wrap.clientHeight * scale));
    return { sx: 0, sy, sw: imgEl.naturalWidth, sh };
  }

  // Tesseract has no real "detect the language" pass — auto-detect instead
  // runs a full OCR pass with every candidate language and keeps whichever
  // one scores highest by total confidence across all 6 fields.
  async function runScan() {
    if (!imgSrc || !imgRef.current) return;
    setScanning(true);
    setFileError(null);
    setScanPct(5);
    try {
      const Tesseract = await loadTesseract();
      const crop = computeVisibleCrop();
      const ocrCanvas = buildOcrCanvas(imgRef.current, crop);
      const candidates = autoDetect ? AUTO_DETECT_SEQUENCE : [scanLang];
      let best = null;
      for (let i = 0; i < candidates.length; i++) {
        const candidateLang = candidates[i];
        const candidateLabel = (OCR_LANGUAGES.find((l) => l.code === candidateLang) || {}).label || candidateLang;
        setScanStatus(autoDetect ? `${tWord("scanningStatus", lang)} — ${candidateLabel} (${i + 1}/${candidates.length})` : tWord("scanningStatus", lang));
        // eslint-disable-next-line no-await-in-loop
        const res = await Tesseract.recognize(ocrCanvas, candidateLang, {
          workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
          corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5",
          logger: (m) => {
            if (m.status) {
              const pct = m.progress ? Math.round(m.progress * 100) : 0;
              const basePct = Math.round((i / candidates.length) * 100);
              setScanPct(Math.max(5, basePct + Math.round(pct / candidates.length)));
            }
          },
        });
        const parsed = parseScanText(res.data);
        // Score by total confidence across all 6 fields (a missing field
        // contributes 0) rather than just "how many fields did it find" —
        // this is what lets a language that finds everything cleanly beat
        // one that also finds everything but shakily. Every candidate in
        // the list gets a full pass; auto-detect picks the best afterward
        // instead of stopping at the first "found everything."
        let score = 0;
        SCAN_FIELDS.forEach((f) => {
          const c = parsed.confidence[f.key];
          score += c === null || c === undefined ? 0 : c;
        });
        if (!best || score > best.score) best = { langUsed: candidateLang, parsed, score };
      }
      // Merge into whatever's already there instead of overwriting — since
      // a scan now only covers the scrolled-to region, a field this pass
      // didn't find might simply be outside the current view (already
      // found correctly by an earlier scan of a different region), not
      // actually missing. Only a field THIS pass did find gets replaced.
      const values = {};
      SCAN_FIELDS.forEach((f) => {
        const found = best.parsed.values[f.key];
        values[f.key] = found === null || found === undefined ? (edited ? edited[f.key] ?? 0 : 0) : found;
      });
      const mergedConfidence = { ...confidence };
      SCAN_FIELDS.forEach((f) => {
        const c = best.parsed.confidence[f.key];
        if (c !== null && c !== undefined) mergedConfidence[f.key] = c;
      });
      setEdited(values);
      setScannedValues(values);
      setConfidence(mergedConfidence);
      setRawText(best.parsed.rawText);
      setScanLang(best.langUsed);
      setDetectedLang(autoDetect ? best.langUsed : null);
      setHasScanned(true);
    } catch {
      setFileError(tWord("scanErrorMsg", lang));
      // Don't wipe out results a PREVIOUS successful scan (of a different
      // scrolled region) already found — only seed empty values if this
      // was the very first attempt.
      if (!edited) {
        const empty = {};
        SCAN_FIELDS.forEach((f) => (empty[f.key] = 0));
        setEdited(empty);
        setScannedValues(empty);
        setConfidence({});
        setRawText("");
        setDetectedLang(null);
      }
      setHasScanned(true);
    } finally {
      setScanning(false);
    }
  }

  function needsReview(key) {
    const c = confidence[key];
    return c === undefined || c === null || c < SCAN_CONF_THRESHOLD;
  }
  // Distinct from needsReview: this is specifically "the label/number
  // couldn't be located at all" (confidence stays null for both the
  // position match and the text-search fallback) — as opposed to "found
  // it, but Tesseract's own score is just cautious," which is common with
  // this game's bold stylized font even on a correct read. Only the
  // former is actually a language/matching problem worth suggesting a
  // screenshot-language change for; the latter just needs a glance.
  function isMissing(key) {
    const c = confidence[key];
    return c === undefined || c === null;
  }
  // T11 (Helios) is only "relevant" to the missing/failure tallies once at
  // least one T11 field was actually located in the scan — most players
  // don't have Helios troops, so 3 permanently-missing T11 fields would
  // otherwise wrongly drag down every single scan's apparent accuracy.
  const hasT11Data = SCAN_FIELDS.some((f) => f.tier === "t11" && !isMissing(f.key));
  const relevantFields = SCAN_FIELDS.filter((f) => f.tier !== "t11" || hasT11Data);
  const missingCount = relevantFields.filter((f) => isMissing(f.key)).length;
  const looksOff = hasScanned && missingCount >= 2 && missingCount < relevantFields.length;
  // Every candidate language (or the single one tried, with auto-detect
  // off) came back with nothing for all relevant fields — meaningfully
  // different from "found some, not others," and "try a different
  // language" is actively misleading here when auto-detect already tried
  // several.
  const totalFailure = hasScanned && missingCount === relevantFields.length;

  function handleApply(targetId) {
    onApply(edited, targetId);
    setOpen(false);
    setImgSrc(null);
    setEdited(null);
    setScannedValues(null);
    setHasScanned(false);
    setFileError(null);
  }

  // Structured "what the scanner read" text — the raw OCR pass plus each
  // field's actual scanned value (not the player's later edits) and
  // confidence, in one place, collapsed by default. Meant to be pasted
  // back for debugging if a reading looks wrong.
  function buildDebugSummary() {
    const lines = [rawText || "(no text detected)", "", "--- parsed field confidence ---"];
    SCAN_FIELDS.forEach((f) => {
      const v = scannedValues ? scannedValues[f.key] : null;
      const c = confidence[f.key];
      const label = `${f.tier.toUpperCase()} ${tType(f.type, lang)}`;
      const valueText = v === null || v === undefined ? "not found" : fmt(v);
      const confText = c !== null && c !== undefined ? ` (${Math.round(c)}% confidence)` : "";
      lines.push(`${label}: ${valueText}${confText}`);
    });
    if (detectedLang) {
      const detectedLabel = (OCR_LANGUAGES.find((l) => l.code === detectedLang) || {}).label || detectedLang;
      lines.push("", `Auto-detect picked: ${detectedLabel}`);
    }
    return lines.join("\n");
  }

  if (!open) {
    return (
      <Btn tone="ghost" small onClick={() => setOpen(true)}>
        {tWord("scanScreenshotBtn", lang)}
      </Btn>
    );
  }

  return (
    <div style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.gold }}>{tWord("scanScreenshotBtn", lang)}</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.sub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {tWord("scanScreenshotHide", lang)}
        </button>
      </div>

      <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5, marginBottom: 12, background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: "8px 10px" }}>
        {tWord("scanInstructions", lang)}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.ink, fontWeight: 600, marginBottom: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={autoDetect}
          onChange={(e) => setAutoDetect(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: C.goldStrong, cursor: "pointer" }}
        />
        {tWord("autoDetectLangLabel", lang)}
      </label>

      {!autoDetect && (
        <div>
          <label style={{ display: "block", fontSize: 11.5, color: C.sub, marginBottom: 5 }}>{tWord("screenshotLangLabel", lang)}</label>
          <select value={scanLang} onChange={(e) => setScanLang(e.target.value)} className="lang-select" style={{ width: "100%", marginBottom: 12 }}>
            {OCR_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      )}
      {autoDetect && detectedLang && !scanning && (
        <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10 }}>
          {tFmt("detectedLangNote", lang, { a: (OCR_LANGUAGES.find((l) => l.code === detectedLang) || {}).label || detectedLang })}
        </div>
      )}

      {!imgSrc ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px dashed ${C.cardBorder}`,
            borderRadius: 12,
            padding: "22px 14px",
            textAlign: "center",
            fontSize: 13,
            color: C.sub,
            cursor: "pointer",
          }}
        >
          {tWord("chooseScreenshot", lang)}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
          />
        </label>
      ) : (
        <div>
          {/* Full device width, capped to roughly a third of a typical tall
              screenshot's height so the top (where troop counts sit) reads
              clearly instead of being shrunk to fit — scrollable so an
              iPhone user can drag down through the rest of the image.
              Scanning reads ONLY whatever's scrolled into view here, not
              the whole screenshot — this doubles as the crop tool. */}
          <div
            ref={scrollWrapRef}
            style={{
              width: "100%",
              maxHeight: "34vh",
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
              borderRadius: 10,
              border: `1px solid ${C.cardBorder}`,
              marginBottom: 6,
              background: C.surface,
            }}
          >
            <img ref={imgRef} src={imgSrc} alt="" style={{ display: "block", width: "100%", height: "auto" }} />
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>{tWord("scanCropHint", lang)}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <Btn tone="gold" small onClick={runScan}>
              {scanning ? scanStatus : hasScanned ? tWord("rescanBtn", lang) : tWord("scanBtn", lang)}
            </Btn>
            <Btn tone="ghost" small onClick={() => { setImgSrc(null); setEdited(null); setScannedValues(null); setConfidence({}); setHasScanned(false); setFileError(null); }}>✕</Btn>
          </div>
          {scanning && <ProgressBar pct={scanPct} tone="green" />}
        </div>
      )}

      {fileError && <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginTop: 8 }}>{fileError}</div>}

      {totalFailure && (
        <div style={{ fontSize: 12, color: C.red, fontWeight: 600, marginTop: 8, background: C.redBg, borderRadius: 10, padding: "8px 10px" }}>
          ⚠ {tWord("scanTotalFailure", lang)}
        </div>
      )}
      {looksOff && (
        <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, marginTop: 8, background: C.amberBg, borderRadius: 10, padding: "8px 10px" }}>
          ⚠ {tWord("scanRetryLangHint", lang)}
        </div>
      )}

      {edited && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, marginBottom: 8 }}>{tWord("scanResultsHeading", lang)}</div>
          {["t11", "t10", "t9"]
            .filter((tier) => tier !== "t11" || SCAN_FIELDS.some((f) => f.tier === "t11" && confidence[f.key] !== null && confidence[f.key] !== undefined))
            .map((tier) => (
            <div key={tier} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 6 }}>{tier.toUpperCase()}{tier === "t11" ? " (Helios)" : ""}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SCAN_FIELDS.filter((f) => f.tier === tier).map((f) => (
                  <div key={f.key} style={{ flex: 1, minWidth: 90 }}>
                    <NumField
                      label={tType(f.type, lang)}
                      value={edited[f.key]}
                      onChange={(v) => setEdited({ ...edited, [f.key]: v })}
                    />
                    {needsReview(f.key) && <div style={{ fontSize: 10.5, color: C.amber, fontWeight: 700, marginTop: 3 }}>⚠ {tWord("needsReviewNote", lang)}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 11.5, color: C.sub }}>{tWord("whatScannerRead", lang)}</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 10.5, color: C.sub, background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: 8, marginTop: 6, maxHeight: 200, overflow: "auto" }}>
              {buildDebugSummary()}
            </pre>
          </details>

          {/* Apply straight to either account — no need to switch the
              active account first just to drop a scan into it. */}
          <div style={{ fontSize: 11.5, color: C.amber, fontWeight: 600, marginTop: 10, lineHeight: 1.4 }}>
            ⚠ {tWord("alwaysDoubleCheckNote", lang)}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {accounts.map((acc) => (
              <Btn key={acc.id} tone="gold" small onClick={() => handleApply(acc.id)}>
                {tWord("applyToPoolBtn", lang)} — {acc.name}{acc.id === activeAccountId ? " ✓" : ""}
              </Btn>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.sub, marginTop: 10 }}>{tWord("scanHint", lang)}</div>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const SAMPLE = {
  t10: { infantry: 197368, lancer: 168958, marksman: 306838 },
  t9: { infantry: 97133, lancer: 98576, marksman: 11916 },
};
const EMPTY = { infantry: 0, lancer: 0, marksman: 0 };

const STORAGE_KEY = "bearTrapCalculator:v1";
const ACTIVE_ACCOUNT_KEY = "bearTrapCalculator:activeAccount";
const ACCOUNT_NAMES_KEY = "bearTrapCalculator:accountNames";

function loadAccountNames() {
  try {
    const raw = localStorage.getItem(ACCOUNT_NAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { A: (parsed && parsed.A) || "Main Account", B: (parsed && parsed.B) || "Farm Account" };
  } catch {
    return { A: "Main Account", B: "Farm Account" };
  }
}

function accountStorageKey(id) {
  return `${STORAGE_KEY}:${id}`;
}

function readActiveAccount() {
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || "A";
  } catch {
    return "A";
  }
}

/* Loads one account's saved data. The very first time Account A is read and
   it has nothing of its own yet, this quietly migrates whatever was saved
   under the old single-account key — so existing players don't lose their
   setup just because two-account support showed up. */
function loadSavedForAccount(id) {
  try {
    const raw = localStorage.getItem(accountStorageKey(id));
    if (raw) return JSON.parse(raw);
    if (id === "A") {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) return JSON.parse(legacy);
    }
    return null;
  } catch {
    return null; // private browsing / storage disabled / corrupted data — just fall back to defaults
  }
}

export default function App() {
  // Which of the two accounts is currently active, and that account's saved
  // data — both loaded once on first render. Every piece of state below
  // falls back to its normal default if nothing was saved for it.
  const [activeAccount, setActiveAccount] = useState(readActiveAccount);
  const [saved] = useState(() => loadSavedForAccount(activeAccount));
  const [accountNames, setAccountNames] = useState(loadAccountNames);

  const [capacity, setCapacity] = useState(saved?.capacity ?? 110000);
  const [numSquads, setNumSquads] = useState(saved?.numSquads ?? 6);
  const [t10, setT10] = useState(saved?.t10 ?? SAMPLE.t10);
  const [t9, setT9] = useState(saved?.t9 ?? SAMPLE.t9);
  // Helios (T11) — the newest, strongest tier. Optional: most players don't
  // have it yet, so it starts hidden and off, and the fields only appear
  // once the player says they actually have some.
  const [hasHelios, setHasHelios] = useState(saved?.hasHelios ?? false);
  const [t11, setT11] = useState(saved?.t11 ?? EMPTY);

  // Infantry per joiner squad is bounded between 0.5% and 3% of that squad's capacity.
  const infantryCap = Math.round(capacity * MAX_JOINER_INFANTRY_PCT);

  // Recommended strategy's ratios are adjustable — Ton Ton's guide is the starting point
  // (0.5% Infantry, 10% Lancer, Marksman fills the rest). Infantry stays hard-bounded at
  // 0.5%–3%. Lancer can be dragged up to 30% — past the point where that starts eating
  // into Marksman's 81% recommendation (or its 60,000 hard floor), the UI warns instead
  // of blocking, since the slider doesn't force Marksman back up artificially.
  const [recInfantryPct, setRecInfantryPct] = useState(saved?.recInfantryPct ?? MIN_JOINER_INFANTRY_PCT * 100);
  const [recLancerPct, setRecLancerPct] = useState(saved?.recLancerPct ?? MIN_JOINER_LANCER_PCT * 100);

  // Manual composition (used when strategy === 'manual')
  const [mode, setMode] = useState(saved?.mode ?? "ratio");
  const [ratio, setRatio] = useState(saved?.ratio ?? { infantry: 2, lancer: 15, marksman: 83 });
  const [exact, setExact] = useState(saved?.exact ?? { infantry: 2200, lancer: 16500, marksman: 91300 });
  // Feeds the Auto Split button below — a floor Auto Split tries to guarantee
  // for Marksman per march, stock permitting.
  const [minMarchMarksman, setMinMarchMarksman] = useState(saved?.minMarchMarksman ?? 0);

  // Squad strategy: manual | recommended
  const [strategy, setStrategy] = useState(saved?.strategy ?? "manual");

  // Rally leader — always used. No ratio is suggested; the player sets their own.
  const [rallyCapacity, setRallyCapacity] = useState(saved?.rallyCapacity ?? 140000);
  // Flat capacity increases the player gets from specific buffs.
  const [cyrilleBoost, setCyrilleBoost] = useState(saved?.cyrilleBoost ?? 0);
  const [snowApeBoost, setSnowApeBoost] = useState(saved?.snowApeBoost ?? 0);
  // Minister of Strategy: 0 = not appointed, otherwise 2000 or 3750 extra deployment capacity.
  const [ministerBoost, setMinisterBoost] = useState(saved?.ministerBoost ?? 0);
  const [rallyMode, setRallyMode] = useState(saved?.rallyMode ?? "exact");
  const [rallyRatio, setRallyRatio] = useState(saved?.rallyRatio ?? { infantry: 0, lancer: 0, marksman: 0 });
  const [rallyExact, setRallyExact] = useState(saved?.rallyExact ?? { infantry: 0, lancer: 0, marksman: 0 });

  const [advancedOpen, setAdvancedOpen] = useState(saved?.advancedOpen ?? true);
  const [darkMode, setDarkMode] = useState(saved?.darkMode ?? false);
  const [lang, setLang] = useState(saved?.lang ?? "en");

  const [fills, setFills] = useState(saved?.fills ?? {});
  function acceptFill(key, tier, type, amount) {
    setFills((prev) => ({ ...prev, [key]: [...(prev[key] || []), { tier, type, amount }] }));
  }
  function removeFill(key, idx) {
    setFills((prev) => {
      const arr = [...(prev[key] || [])];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr };
    });
  }

  // Auto-save everything the player has entered so it survives a refresh —
  // scoped to whichever account is currently active, so switching accounts
  // never mixes the two troop pools together.
  useEffect(() => {
    try {
      localStorage.setItem(
        accountStorageKey(activeAccount),
        JSON.stringify({
          capacity, numSquads, t10, t9, t11, hasHelios,
          mode, ratio, exact, minMarchMarksman,
          strategy,
          rallyCapacity, cyrilleBoost, snowApeBoost, ministerBoost, rallyMode, rallyRatio, rallyExact,
          advancedOpen, darkMode, lang, fills, recInfantryPct, recLancerPct,
        })
      );
    } catch {
      // storage full or disabled — nothing to do, the app still works without it
    }
  }, [
    activeAccount,
    capacity, numSquads, t10, t9, t11, hasHelios,
    mode, ratio, exact, minMarchMarksman,
    strategy,
    rallyCapacity, cyrilleBoost, snowApeBoost, ministerBoost, rallyMode, rallyRatio, rallyExact,
    advancedOpen, darkMode, lang, fills, recInfantryPct, recLancerPct,
  ]);

  const tr = (key) => (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;

  const targetManual = useMemo(() => computeTarget(capacity, mode, ratio, exact), [capacity, mode, ratio, exact]);
  const effectiveRallyCapacity = rallyCapacity + cyrilleBoost + snowApeBoost + ministerBoost;

  const rallyTarget = useMemo(() => computeTarget(effectiveRallyCapacity, rallyMode, rallyRatio, rallyExact), [effectiveRallyCapacity, rallyMode, rallyRatio, rallyExact]);

  // Rally leader consumes from the pool first, independent of joiner strategy.
  const rallyComputation = useMemo(() => {
    const pools = { t11: { ...t11 }, t10: { ...t10 }, t9: { ...t9 } };
    let result = null;
    if (rallyTarget.valid) result = allocateSquad(effectiveRallyCapacity, rallyTarget, pools, fills["rally"] || []);
    return { result, pools };
  }, [t11, t10, t9, rallyTarget, effectiveRallyCapacity, fills]);

  const joinerAvailable = useMemo(() => {
    const p = rallyComputation.pools;
    const obj = {};
    TYPES.forEach((t) => (obj[t] = p.t11[t] + p.t10[t] + p.t9[t]));
    return obj;
  }, [rallyComputation]);

  // The sliders physically can't be dragged past what the pool can actually supply —
  // this is a hard stock limit, separate from (and independent of) the softer
  // 60,000-Marksman warning below. Recomputed live as the troop pool changes.
  const infantryStockMaxPct =
    numSquads > 0 && capacity > 0
      ? Math.min(MAX_JOINER_INFANTRY_PCT * 100, (Math.floor(joinerAvailable.infantry / numSquads) / capacity) * 100)
      : MAX_JOINER_INFANTRY_PCT * 100;
  const infantryEffectiveMax = Math.max(MIN_JOINER_INFANTRY_PCT * 100, infantryStockMaxPct);
  const infantryStockLimited = infantryStockMaxPct < MAX_JOINER_INFANTRY_PCT * 100 - 0.001;

  const lancerStockMaxPct =
    numSquads > 0 && capacity > 0
      ? Math.min(MAX_JOINER_LANCER_UI_PCT * 100, (Math.floor(joinerAvailable.lancer / numSquads) / capacity) * 100)
      : MAX_JOINER_LANCER_UI_PCT * 100;
  const lancerEffectiveMax = Math.max(5, lancerStockMaxPct);
  const lancerStockLimited = lancerStockMaxPct < MAX_JOINER_LANCER_UI_PCT * 100 - 0.001;

  const effectiveRecInfantryPct = Math.min(recInfantryPct, infantryEffectiveMax);
  const effectiveRecLancerPct = Math.min(recLancerPct, lancerEffectiveMax);

  const recommendedTarget = useMemo(
    () =>
      priorityTargetWithFloors(
        capacity,
        joinerAvailable,
        numSquads,
        { infantry: Math.max(DIVERSITY_FLOOR, Math.round(capacity * (effectiveRecInfantryPct / 100))), lancer: Math.max(DIVERSITY_FLOOR, Math.round(capacity * (effectiveRecLancerPct / 100))), marksman: DIVERSITY_FLOOR },
        { infantry: infantryCap }
      ),
    [capacity, joinerAvailable, numSquads, infantryCap, effectiveRecInfantryPct, effectiveRecLancerPct]
  );
  // Marksman isn't a slider — it's whatever's left after Infantry and Lancer. This flag
  // drives the one remaining warning: dropping below the hard 60,000 floor.
  const recMarksmanPct = capacity > 0 ? (recommendedTarget.marksman / capacity) * 100 : 100;
  const recBelow60k = recommendedTarget.marksman < MIN_JOINER_MARKSMAN;

  const computation = useMemo(() => {
    const pools = { t11: { ...rallyComputation.pools.t11 }, t10: { ...rallyComputation.pools.t10 }, t9: { ...rallyComputation.pools.t9 } };
    const squads = [];
    for (let i = 0; i < numSquads; i++) {
      const tgt = strategy === "manual" ? targetManual : recommendedTarget;

      if (!tgt.valid) {
        squads.push(null);
        continue;
      }
      const sq = allocateSquad(capacity, tgt, pools, fills[i + 1] || []);
      // Snapshot what's left in the shared pool right after this squad draws
      // from it, so Squad Results can show a running total while scrolling
      // instead of making the player jump back up to Remaining Troops.
      sq.remainingAfter = {};
      TYPES.forEach((t) => (sq.remainingAfter[t] = pools.t11[t] + pools.t10[t] + pools.t9[t]));
      squads.push(sq);
    }
    return { squads, pools };
  }, [rallyComputation, numSquads, strategy, targetManual, recommendedTarget, capacity, fills]);

  const totalAvailable = TYPES.reduce((s, t) => s + t11[t] + t10[t] + t9[t], 0);
  const rallyAllocated = rallyComputation.result ? rallyComputation.result.totalAllocated : 0;
  const totalAllocated = computation.squads.reduce((s, sq) => s + (sq ? sq.totalAllocated : 0), 0) + rallyAllocated;
  const totalRemaining = totalAvailable - totalAllocated;
  const totalCapacityRequired = capacity * numSquads + effectiveRallyCapacity;
  const fullCount = computation.squads.filter((s) => s && s.status === "full").length;
  const partialCount = computation.squads.filter((s) => s && s.status === "partial").length;
  const unfilledSpaces = Math.max(0, totalCapacityRequired - totalAllocated);
  const noTroopsEntered = totalAvailable === 0;

  // Lightweight toast/snackbar — used for "Undo" after a destructive action
  // and for copy-to-clipboard confirmation. Auto-dismisses after a delay.
  const [toast, setToast] = useState(null); // { message, actionLabel, onAction }
  // Bumped whenever Auto Split or "Use Recommended's numbers" writes new
  // values into the Exact fields, so that panel can briefly flash to show
  // something changed without the player having to notice on their own.
  const [flashSignal, setFlashSignal] = useState(0);
  const toastTimerRef = useRef(null);
  function showToast(message, actionLabel, onAction, duration = 6000) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, actionLabel, onAction });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }
  function dismissToast() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }

  function clearTroops() {
    const snapshot = { t10, t9, t11, fills };
    setT10(EMPTY);
    setT9(EMPTY);
    setT11(EMPTY);
    setFills({});
    showToast(tr("clearedTroopsToast"), tr("undoAction"), () => {
      setT10(snapshot.t10);
      setT9(snapshot.t9);
      setT11(snapshot.t11);
      setFills(snapshot.fills);
      dismissToast();
    });
  }
  // Applies a completed screenshot scan either to the currently active
  // account (live state, same Undo pattern as Clear/Reset) or straight into
  // the OTHER account's saved data in the background — no need to switch
  // accounts first just to drop a scan into the one you're not looking at.
  // T11 (Helios) only comes along, and only auto-switches that account's
  // Helios toggle on, if the scan actually found a T11 row — never assumed.
  function handleApplyScan(scanned, targetId) {
    const t11Vals = { infantry: scanned.t11Infantry ?? 0, lancer: scanned.t11Lancer ?? 0, marksman: scanned.t11Marksman ?? 0 };
    const t10Vals = { infantry: scanned.t10Infantry, lancer: scanned.t10Lancer, marksman: scanned.t10Marksman };
    const t9Vals = { infantry: scanned.t9Infantry, lancer: scanned.t9Lancer, marksman: scanned.t9Marksman };
    const foundHelios = TYPES.some((t) => t11Vals[t] > 0);
    if (targetId === activeAccount) {
      const previousT10 = t10;
      const previousT9 = t9;
      const previousT11 = t11;
      const previousHasHelios = hasHelios;
      setT10(t10Vals);
      setT9(t9Vals);
      if (foundHelios) {
        setT11(t11Vals);
        setHasHelios(true);
      }
      showToast(tr("appliedScanToast"), tr("undoAction"), () => {
        setT10(previousT10);
        setT9(previousT9);
        setT11(previousT11);
        setHasHelios(previousHasHelios);
        dismissToast();
      });
    } else {
      try {
        const existing = loadSavedForAccount(targetId) || {};
        const merged = { ...existing, t10: t10Vals, t9: t9Vals };
        if (foundHelios) {
          merged.t11 = t11Vals;
          merged.hasHelios = true;
        }
        localStorage.setItem(accountStorageKey(targetId), JSON.stringify(merged));
        showToast(tFmt("appliedScanToOtherToast", lang, { a: accountNames[targetId] }), null, null, 2500);
      } catch {
        showToast(tr("scanErrorMsg"), null, null, 2500);
      }
    }
  }
  function resetAll() {
    const snapshot = {
      capacity, numSquads, t10, t9, t11, hasHelios,
      mode, ratio, exact, minMarchMarksman,
      strategy,
      rallyCapacity, cyrilleBoost, snowApeBoost, ministerBoost, rallyMode, rallyRatio, rallyExact,
      recInfantryPct, recLancerPct, fills,
    };
    setCapacity(110000);
    setNumSquads(6);
    setT10(SAMPLE.t10);
    setT9(SAMPLE.t9);
    setT11(EMPTY);
    setHasHelios(false);
    setMode("ratio");
    setRatio({ infantry: 2, lancer: 15, marksman: 83 });
    setExact({ infantry: 2200, lancer: 16500, marksman: 91300 });
    setMinMarchMarksman(0);
    setStrategy("manual");
    setRallyCapacity(140000);
    setCyrilleBoost(0);
    setSnowApeBoost(0);
    setMinisterBoost(0);
    setRallyMode("exact");
    setRallyRatio({ infantry: 0, lancer: 0, marksman: 0 });
    setRallyExact({ infantry: 0, lancer: 0, marksman: 0 });
    setRecInfantryPct(MIN_JOINER_INFANTRY_PCT * 100);
    setRecLancerPct(MIN_JOINER_LANCER_PCT * 100);
    setFills({});
    try {
      localStorage.removeItem(accountStorageKey(activeAccount));
    } catch {
      // storage unavailable — state is already reset regardless
    }
    showToast(tr("resetToast"), tr("undoAction"), () => {
      setCapacity(snapshot.capacity);
      setNumSquads(snapshot.numSquads);
      setT10(snapshot.t10);
      setT9(snapshot.t9);
      setT11(snapshot.t11);
      setHasHelios(snapshot.hasHelios);
      setMode(snapshot.mode);
      setRatio(snapshot.ratio);
      setExact(snapshot.exact);
      setMinMarchMarksman(snapshot.minMarchMarksman);
      setStrategy(snapshot.strategy);
      setRallyCapacity(snapshot.rallyCapacity);
      setCyrilleBoost(snapshot.cyrilleBoost);
      setSnowApeBoost(snapshot.snowApeBoost);
      setMinisterBoost(snapshot.ministerBoost);
      setRallyMode(snapshot.rallyMode);
      setRallyRatio(snapshot.rallyRatio);
      setRallyExact(snapshot.rallyExact);
      setRecInfantryPct(snapshot.recInfantryPct);
      setRecLancerPct(snapshot.recLancerPct);
      setFills(snapshot.fills);
      dismissToast();
    });
  }
  // The full shape of "one account's setup" — used when switching between
  // Account A/B, so each keeps its own independent troop pool and settings.
  function buildAccountSnapshot() {
    return {
      capacity, numSquads, t10, t9, t11, hasHelios,
      mode, ratio, exact, minMarchMarksman,
      strategy,
      rallyCapacity, cyrilleBoost, snowApeBoost, ministerBoost, rallyMode, rallyRatio, rallyExact,
      recInfantryPct, recLancerPct, fills,
    };
  }
  function applyAccountSnapshot(data) {
    setCapacity(data.capacity ?? 110000);
    setNumSquads(data.numSquads ?? 6);
    setT10(data.t10 ?? SAMPLE.t10);
    setT9(data.t9 ?? SAMPLE.t9);
    setT11(data.t11 ?? EMPTY);
    setHasHelios(data.hasHelios ?? false);
    setMode(data.mode ?? "ratio");
    setRatio(data.ratio ?? { infantry: 2, lancer: 15, marksman: 83 });
    setExact(data.exact ?? { infantry: 2200, lancer: 16500, marksman: 91300 });
    setMinMarchMarksman(data.minMarchMarksman ?? 0);
    setStrategy(data.strategy ?? "manual");
    setRallyCapacity(data.rallyCapacity ?? 140000);
    setCyrilleBoost(data.cyrilleBoost ?? 0);
    setSnowApeBoost(data.snowApeBoost ?? 0);
    setMinisterBoost(data.ministerBoost ?? 0);
    setRallyMode(data.rallyMode ?? "exact");
    setRallyRatio(data.rallyRatio ?? { infantry: 0, lancer: 0, marksman: 0 });
    setRallyExact(data.rallyExact ?? { infantry: 0, lancer: 0, marksman: 0 });
    setRecInfantryPct(data.recInfantryPct ?? MIN_JOINER_INFANTRY_PCT * 100);
    setRecLancerPct(data.recLancerPct ?? MIN_JOINER_LANCER_PCT * 100);
    setFills(data.fills ?? {});
    setFlashSignal((n) => n + 1);
  }

  // Two accounts, two independent troop pools — switching saves whatever
  // the player was just looking at under the account they're leaving, then
  // loads the other account's own saved setup (or clean defaults, the
  // first time it's used).
  function switchAccount(target) {
    if (target === activeAccount) return;
    try {
      localStorage.setItem(accountStorageKey(activeAccount), JSON.stringify(buildAccountSnapshot()));
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, target);
    } catch {
      // storage unavailable — still switch in memory for this session
    }
    applyAccountSnapshot(loadSavedForAccount(target) || {});
    setActiveAccount(target);
    showToast(tr("switchedAccountToast"), null, null, 2000);
  }

  function handleRenameAccount(id) {
    const current = accountNames[id];
    const name = typeof window !== "undefined" ? window.prompt(tr("renameAccountPrompt"), current) : null;
    if (!name || !name.trim()) return;
    const updated = { ...accountNames, [id]: name.trim() };
    setAccountNames(updated);
    try {
      localStorage.setItem(ACCOUNT_NAMES_KEY, JSON.stringify(updated));
    } catch {
      // storage unavailable — name still applies for this session
    }
  }

  function applyRecommendedToManual() {
    setStrategy("manual");
    setMode("exact");
    setExact({ infantry: recommendedTarget.infantry, lancer: recommendedTarget.lancer, marksman: recommendedTarget.marksman });
    setFlashSignal((n) => n + 1);
  }

  // Auto Split — a one-tap starting point for "Short on Troops": splits
  // whatever's actually left in the pool evenly across every march, trying
  // to guarantee the requested Marksman minimum first (stock permitting),
  // then drops the result into the Exact fields for further hand-tuning.
  function handleAutoSplit() {
    const previousMode = mode;
    const previousExact = exact;
    // Start from Ton Ton's ratio (2% Infantry, ~10% Lancer, Marksman at
    // least the player's requested minimum) — then, unlike Recommended,
    // let any capacity that's still unfilled cascade through Marksman →
    // Lancer → Infantry (Ton Ton's own priority order) using whatever stock
    // is actually left, so the march fills completely even when the pool
    // can't support the ideal ratio.
    const autoInfantryFloor = Math.max(DIVERSITY_FLOOR, Math.round(capacity * 0.02));
    const autoLancerFloor = Math.max(DIVERSITY_FLOOR, Math.round(capacity * MIN_JOINER_LANCER_PCT));
    const auto = priorityTargetWithFloors(
      capacity,
      joinerAvailable,
      numSquads,
      { infantry: autoInfantryFloor, lancer: autoLancerFloor, marksman: Math.max(DIVERSITY_FLOOR, minMarchMarksman) },
      {},
      ["marksman", "lancer", "infantry"]
    );
    setMode("exact");
    setExact({ infantry: auto.infantry, lancer: auto.lancer, marksman: auto.marksman });
    setFlashSignal((n) => n + 1);
    showToast(tr("autoSplitApplied"), tr("undoAction"), () => {
      setMode(previousMode);
      setExact(previousExact);
      dismissToast();
    });
  }

  const remT11 = computation.pools.t11;
  const remT10 = computation.pools.t10;
  const remT9 = computation.pools.t9;

  // Builds a plain-text summary of the whole squad plan, formatted for
  // pasting straight into a Discord or alliance chat message.
  function buildShareText() {
    const lines = ["🐻 Bear Trap Squad Plan"];
    if (rallyComputation.result) {
      const r = rallyComputation.result;
      lines.push(`${tr("leaderLabel")}: ${fmt(r.breakdown.infantry.total)} - ${fmt(r.breakdown.lancer.total)} - ${fmt(r.breakdown.marksman.total)}`);
    }
    lines.push("");

    // Group consecutive squads that share the exact same composition into
    // one "Squad X-Y: ..." line instead of repeating an identical row for
    // every squad.
    const squads = computation.squads;
    let i = 0;
    while (i < squads.length) {
      const sq = squads[i];
      if (!sq) { i++; continue; }
      let j = i;
      while (
        j + 1 < squads.length &&
        squads[j + 1] &&
        squads[j + 1].breakdown.infantry.total === sq.breakdown.infantry.total &&
        squads[j + 1].breakdown.lancer.total === sq.breakdown.lancer.total &&
        squads[j + 1].breakdown.marksman.total === sq.breakdown.marksman.total
      ) {
        j++;
      }
      const label = i === j ? `${tr("squadLabel")} ${i + 1}` : `${tr("squadLabel")} ${i + 1}-${j + 1}`;
      lines.push(`${label}: ${fmt(sq.breakdown.infantry.total)} - ${fmt(sq.breakdown.lancer.total)} - ${fmt(sq.breakdown.marksman.total)}`);
      i = j + 1;
    }

    lines.push("");
    lines.push(`${tr("remainingTroopsHeading")}: ${fmt(remT11.infantry + remT10.infantry + remT9.infantry)} - ${fmt(remT11.lancer + remT10.lancer + remT9.lancer)} - ${fmt(remT11.marksman + remT10.marksman + remT9.marksman)}`);
    return lines.join("\n");
  }

  async function handleCopyPlan() {
    const text = buildShareText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("clipboard API unavailable");
      }
      showToast(tr("copiedToast"), null, null, 2500);
    } catch {
      showToast(tr("copyFailedToast"), null, null, 3000);
    }
  }

  return (
    <div
      className={darkMode ? "dark" : ""}
      style={{
        background: "var(--pageGradient)",
        minHeight: "100vh",
        fontFamily: "'Nunito Sans', system-ui, -apple-system, sans-serif",
        color: C.ink,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Nunito+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --bgPage: #E7F1F4;
          --surface: #F7F3E8;
          --headerBg: rgba(247,243,232,.88);
          --headerBorder: rgba(200,218,221,.9);
          --cardBgT: rgba(247,243,232,.94);
          --cardBorderT: rgba(200,218,221,.95);
          --cardBorder: #C8DADD;
          --inputBg: #FFFFFF;
          --inputBorder: #C8DADD;
          --gold: #315B55;
          --goldStrong: #E9A548;
          --goldBg: #E4EEEC;
          --goldBorder: #BFD8D2;
          --green: #397255;
          --greenBg: #D9EBDD;
          --amber: #C65D43;
          --amberBg: #F3D8CF;
          --red: #9A4938;
          --redBg: #F1D5CB;
          --ink: #214641;
          --sub: #78919A;
          --cocoa: #6B4938;
          --cocoaDark: #214641;
          --white: #FFFFFF;
          --teal: #3FA7A1;
          --t9Amber: #E8A34A;
          --statusT9Bg: #F6E2B9;
          --statusT9Text: #8B5B20;
          --selectedBg: #315B55;
          --selectedBorder: #214641;
          --selectedText: #F7F3E8;
          --selectedTextMuted: rgba(247,243,232,.8);
          --neutralChipBg: #F1E9DA;
          --progressTrackBg: #EDE2CC;
          --tierTrackBg: #DCE8E8;
          --btnSecondaryBg: #DDEBED;
          --btnSecondaryBorder: #B8D0D4;
          --btnPrimaryShadow: #1D3833;
          --btnGoldShadow: #B9782E;
          --squadFullBorder: #C9DED0;
          --squadPartialBorder: #F0D9AE;
          --pageGradient: radial-gradient(circle at 12% 8%, rgba(255,255,255,.7), transparent 24%), radial-gradient(circle at 88% 18%, rgba(142,187,200,.25), transparent 26%), linear-gradient(145deg, #E7F1F4 0%, #D8EBEE 52%, #C7E1E8 100%);
        }
        .dark {
          --bgPage: #14181A;
          --surface: #26211C;
          --headerBg: rgba(38,33,28,.88);
          --headerBorder: rgba(90,80,65,.5);
          --cardBgT: rgba(38,33,28,.92);
          --cardBorderT: rgba(90,80,65,.45);
          --cardBorder: #453D33;
          --inputBg: #1C1914;
          --inputBorder: #453D33;
          --gold: #8FC9B5;
          --goldStrong: #EDAE5E;
          --goldBg: #223029;
          --goldBorder: #3B5148;
          --green: #7FCB9C;
          --greenBg: #1F3126;
          --amber: #E2896E;
          --amberBg: #3A241D;
          --red: #E2937F;
          --redBg: #3A231D;
          --ink: #F3EDE0;
          --sub: #A79A85;
          --cocoa: #C9A480;
          --cocoaDark: #241B10;
          --white: #FFFDF8;
          --teal: #5FC2BB;
          --t9Amber: #F0B563;
          --statusT9Bg: #3D2C16;
          --statusT9Text: #E7BE7C;
          --selectedBg: #3A6459;
          --selectedBorder: #244039;
          --selectedText: #F3EDE0;
          --selectedTextMuted: rgba(243,237,224,.75);
          --neutralChipBg: #33291C;
          --progressTrackBg: #332B1F;
          --tierTrackBg: #2A3532;
          --btnSecondaryBg: #2A3530;
          --btnSecondaryBorder: #445048;
          --btnPrimaryShadow: #16281F;
          --btnGoldShadow: #A06B28;
          --squadFullBorder: #3B5148;
          --squadPartialBorder: #4A3B22;
          --pageGradient: radial-gradient(circle at 12% 8%, rgba(255,255,255,.03), transparent 24%), radial-gradient(circle at 88% 18%, rgba(95,194,187,.10), transparent 26%), linear-gradient(145deg, #171B1D 0%, #14181A 52%, #101415 100%);
        }

        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2.5px solid ${C.teal}; outline-offset: 2px; }
        button { transition: transform .12s ease, filter .12s ease; }
        button:active { transform: translateY(1px) scale(.98); }

        .app-shell { width: min(100% - 32px, 1120px); margin: 0 auto; padding: 20px 0 48px; position: relative; z-index: 1; }
        .section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 720px) {
          .app-shell { width: min(100% - 24px, 560px); padding-top: 16px; }
          .section-grid { grid-template-columns: 1fr; }
        }

        .calc-card {
          background: var(--cardBgT);
          border: 1px solid var(--cardBorderT);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 5px 0 rgba(49,91,85,.08), 0 12px 28px rgba(33,70,65,.08);
          box-sizing: border-box;
        }
        @media (max-width: 720px) { .calc-card { padding: 14px; } }

        .calc-input {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid ${C.cardBorder};
          border-radius: 10px;
          background: ${C.inputBg};
          color: ${C.ink};
          font: 700 16px/22px 'Nunito Sans', sans-serif;
          outline: none;
          box-sizing: border-box;
        }
        .calc-input:focus { border-color: ${C.teal}; box-shadow: 0 0 0 3px rgba(63,167,161,.2); }

        .lang-select {
          min-height: 38px;
          padding: 7px 10px;
          border-radius: 10px;
          border: 1px solid ${C.cardBorder};
          background: ${C.inputBg};
          color: ${C.ink};
          font: 700 12.5px 'Nunito Sans', sans-serif;
          cursor: pointer;
        }

        .strategy-card { text-align: left; cursor: pointer; min-height: 112px; padding: 14px; border-radius: 14px; box-sizing: border-box; }
        .strategy-card.selected { background: var(--selectedBg); border-color: var(--selectedBorder); color: var(--selectedText); box-shadow: 0 4px 0 rgba(33,70,65,.25); }
        .strategy-card.unselected { background: ${C.inputBg}; border: 1px solid ${C.cardBorder}; color: ${C.ink}; }

        .header-bear { width: 120px; opacity: .95; transform: rotate(-2deg); flex-shrink: 0; }
        @media (max-width: 720px) { .header-bear { width: 84px; } }

        .ratio-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 12px;
          border-radius: 999px;
          outline: none;
          cursor: grab;
          margin: 0;
          transition: box-shadow .15s ease;
        }
        .ratio-slider:active { cursor: grabbing; }
        .ratio-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: ${C.surface};
          border: 5px solid ${C.goldStrong};
          box-shadow: 0 2px 8px rgba(33,70,65,.35);
          cursor: grab;
          margin-top: 0;
          transition: transform .1s ease, box-shadow .15s ease;
        }
        .ratio-slider::-webkit-slider-thumb:hover { transform: scale(1.12); box-shadow: 0 3px 12px rgba(33,70,65,.45); }
        .ratio-slider:active::-webkit-slider-thumb { transform: scale(1.18); cursor: grabbing; }
        .ratio-slider::-moz-range-thumb {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: ${C.surface};
          border: 5px solid ${C.goldStrong};
          box-shadow: 0 2px 8px rgba(33,70,65,.35);
          cursor: grab;
          transition: transform .1s ease, box-shadow .15s ease;
        }
        .ratio-slider::-moz-range-thumb:hover { transform: scale(1.12); }
        .ratio-slider::-moz-range-track { height: 12px; border-radius: 999px; }

        @keyframes flashPulse {
          0% { box-shadow: 0 0 0 3px ${C.goldStrong}; border-radius: 18px; }
          100% { box-shadow: 0 0 0 0 transparent; border-radius: 18px; }
        }
        .flash-once { animation: flashPulse 900ms ease; }
      `}</style>

      {/* Subtle paper-grain texture — kept low-opacity behind all content */}
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
        <filter id="paperGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.29  0 0 0 0 0.22  0 0 0 0.5 0" />
        </filter>
      </svg>
      <div style={{ position: "absolute", inset: 0, zIndex: 0, filter: "url(#paperGrain)", opacity: 0.08, mixBlendMode: "multiply", pointerEvents: "none" }} />

      {/* Decorative watercolor corner accents — low opacity, never behind text */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <PineTree width={44} height={58} style={{ position: "absolute", top: 6, left: -6 }} />
        <Snowflake size={16} style={{ position: "absolute", top: 20, left: 60 }} />
        <Snowflake size={22} style={{ position: "absolute", top: 90, right: 18 }} />
        <PineTree width={34} height={46} style={{ position: "absolute", top: 100, right: -4 }} />
        <CampScene width={120} height={70} style={{ position: "absolute", bottom: 10, right: -10, opacity: 0.7 }} />
        <Snowflake size={18} style={{ position: "absolute", bottom: 140, left: 14 }} />
      </div>

      <div className="app-shell">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            padding: "20px 22px",
            marginBottom: 18,
            borderRadius: 22,
            background: "var(--headerBg)",
            border: "1px solid var(--headerBorder)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ margin: 0, color: C.gold, fontFamily: "'Fredoka', sans-serif", fontSize: 30, fontWeight: 600, lineHeight: "36px", letterSpacing: -0.3 }}>
              Caroline's Bear Trap Squad Calculator
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select
              aria-label="Language"
              className="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
            <Btn tone="ghost" small onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? `☀️ ${tr("lightToggle")}` : `🌙 ${tr("darkToggle")}`}
            </Btn>
            <BearMascot className="header-bear" />
          </div>
        </div>

        {/* ACCOUNT SWITCHER — its own prominent bar, not squeezed into the
            header, since many players run two separate Bear Traps. */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { id: "A", accent: C.goldStrong },
            { id: "B", accent: TYPE_COLOR.lancer },
          ].map((acc) => {
            const selected = activeAccount === acc.id;
            return (
              <button
                key={acc.id}
                onClick={() => switchAccount(acc.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  border: `2px solid ${selected ? acc.accent : C.cardBorder}`,
                  background: selected ? acc.accent : C.surface,
                  borderRadius: 16,
                  padding: "12px 14px",
                  cursor: "pointer",
                  boxShadow: selected ? "0 3px 10px rgba(33,70,65,.25)" : "none",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: selected ? C.cocoaDark : C.ink,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {accountNames[acc.id]}
                </span>
                {selected && (
                  <span
                    role="button"
                    aria-label={tr("renameAccountPrompt")}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameAccount(acc.id);
                    }}
                    style={{ fontSize: 14, cursor: "pointer", flexShrink: 0, opacity: 0.85 }}
                  >
                    ✏️
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ position: "sticky", top: 0, zIndex: 10, marginBottom: 16 }} className="calc-card">
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            <SummaryStat label={tr("availableStat")} value={fmt(totalAvailable)} />
            <StatDivider />
            <SummaryStat label={tr("allocatedStat")} value={fmt(totalAllocated)} />
            <StatDivider />
            <SummaryStat label={tr("remainingStat")} value={fmt(totalRemaining)} />
            <StatDivider />
            <SummaryStat label={tr("fullSquadsLabel")} value={`${fullCount}/${numSquads}`} tone="green" />
            <StatDivider />
            <SummaryStat label={tr("partialStat")} value={partialCount} tone="amber" />
            <StatDivider />
            <SummaryStat label={tr("unfilledStat")} value={fmt(unfilledSpaces)} tone={unfilledSpaces > 0 ? "amber" : "green"} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* TROOP POOL */}
          <Card>
          <SectionHeader step={1} title={tr("troopPool")} sub={tr("troopPoolSub")} />
          {noTroopsEntered && (
            <div style={{ background: C.amberBg, color: C.amber, borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
              {tr("noTroops")}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <ScreenshotScanner
              lang={lang}
              accounts={[{ id: "A", name: accountNames.A }, { id: "B", name: accountNames.B }]}
              activeAccountId={activeAccount}
              onApply={handleApplyScan}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, fontWeight: 600, color: C.ink, cursor: "pointer", marginBottom: hasHelios ? 10 : 4 }}>
            <input
              type="checkbox"
              checked={hasHelios}
              onChange={(e) => setHasHelios(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: C.goldStrong, cursor: "pointer" }}
            />
            {tr("hasHeliosLabel")}
          </label>
          {hasHelios && (
            <div>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 800, lineHeight: "20px", color: C.gold, marginBottom: 6 }}>T11 (Helios)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <NumField label={tType("infantry", lang)} value={t11.infantry} onChange={(v) => setT11({ ...t11, infantry: v })} />
                <NumField label={tType("lancer", lang)} value={t11.lancer} onChange={(v) => setT11({ ...t11, lancer: v })} />
                <NumField label={tType("marksman", lang)} value={t11.marksman} onChange={(v) => setT11({ ...t11, marksman: v })} />
              </div>
            </div>
          )}
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 800, lineHeight: "20px", color: C.gold, marginTop: 4, marginBottom: 6 }}>T10</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <NumField label={tType("infantry", lang)} value={t10.infantry} onChange={(v) => setT10({ ...t10, infantry: v })} />
            <NumField label={tType("lancer", lang)} value={t10.lancer} onChange={(v) => setT10({ ...t10, lancer: v })} />
            <NumField label={tType("marksman", lang)} value={t10.marksman} onChange={(v) => setT10({ ...t10, marksman: v })} />
          </div>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 800, lineHeight: "20px", color: C.gold, marginBottom: 6 }}>T9</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <NumField label={tType("infantry", lang)} value={t9.infantry} onChange={(v) => setT9({ ...t9, infantry: v })} />
            <NumField label={tType("lancer", lang)} value={t9.lancer} onChange={(v) => setT9({ ...t9, lancer: v })} />
            <NumField label={tType("marksman", lang)} value={t9.marksman} onChange={(v) => setT9({ ...t9, marksman: v })} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <TroopChip label="Inf" value={t10.infantry + t9.infantry} color={TYPE_COLOR.infantry} />
            <TroopChip label="Lan" value={t10.lancer + t9.lancer} color={TYPE_COLOR.lancer} />
            <TroopChip label="Mar" value={t10.marksman + t9.marksman} color={TYPE_COLOR.marksman} />
            <TroopChip label={tr("totalPoolLabel")} value={totalAvailable} color={C.gold} strong />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn tone="danger" onClick={clearTroops}>{tr("clearAll")}</Btn>
            <Btn tone="ghost" onClick={resetAll}>{tr("reset")}</Btn>
          </div>
        </Card>

          {/* RALLY LEADER + JOINER SQUADS — paired side by side on wide screens */}
          <div className="section-grid">
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setAdvancedOpen(!advancedOpen)}>
            <SectionHeader step={2} title={tr("rallyLeader")} sub={tr("rallyLeaderSub")} />
            <span style={{ color: C.gold, fontWeight: 600, fontSize: 18, flexShrink: 0, paddingLeft: 10 }}>{advancedOpen ? "−" : "+"}</span>
          </div>
          {advancedOpen && (
            <div>
              <NumField label={tr("rallyBaseCapacity")} value={rallyCapacity} onChange={setRallyCapacity} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <NumField label={tr("cyrilleBoostLabel")} value={cyrilleBoost} onChange={setCyrilleBoost} />
                <NumField label={tr("snowApeBoostLabel")} value={snowApeBoost} onChange={setSnowApeBoost} />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, fontWeight: 500, color: C.ink, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ministerBoost > 0}
                    onChange={(e) => setMinisterBoost(e.target.checked ? 2000 : 0)}
                    style={{ width: 17, height: 17, accentColor: C.goldStrong, cursor: "pointer" }}
                  />
                  {tr("ministerAppointed")}
                </label>
                {ministerBoost > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                    <Btn tone={ministerBoost === 2000 ? "primary" : "ghost"} small onClick={() => setMinisterBoost(2000)}>{tr("minister2000")}</Btn>
                    <Btn tone={ministerBoost === 3750 ? "primary" : "ghost"} small onClick={() => setMinisterBoost(3750)}>{tr("minister3750")}</Btn>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, marginBottom: 10, fontSize: 12, fontWeight: 500, color: C.gold, background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: "6px 10px" }}>
                {tr("effectiveCapacity")}: {fmt(rallyCapacity)} + {fmt(cyrilleBoost)} + {fmt(snowApeBoost)} + {fmt(ministerBoost)} = {fmt(effectiveRallyCapacity)}
              </div>
              <CompositionInputs capacity={effectiveRallyCapacity} mode={rallyMode} setMode={setRallyMode} ratio={rallyRatio} setRatio={setRallyRatio} exact={rallyExact} setExact={setRallyExact} target={rallyTarget} lang={lang} />
              {rallyComputation.result && (
                <div style={{ marginTop: 10 }}>
                  <SquadCard index="Leader" squadKey="rally" result={rallyComputation.result} invalid={false} onAcceptFill={acceptFill} onRemoveFill={removeFill} lang={lang} />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* JOINER SQUADS (formerly Settings) */}
        <Card>
          <SectionHeader step={3} title={tr("joinerSquadsLabel")} sub={tr("settingsSub")} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <NumField label={tr("squadCapacity")} value={capacity} onChange={setCapacity} />
            <NumField label={tr("numSquadsLabel")} value={numSquads} onChange={setNumSquads} />
          </div>
        </Card>
          </div>

        {/* SQUAD STRATEGY */}
        <Card>
          <SectionHeader step={4} title={tr("squadStrategy")} sub={tr("squadStrategySub")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              { key: "manual", label: tr("manual"), note: tr("manualNote"), star: false },
              { key: "recommended", label: tr("recommended"), note: tr("recommendedNote"), star: true },
            ].map((opt) => {
              const selected = strategy === opt.key;
              const showPoolWarning = opt.key === "recommended" && recBelow60k;
              return (
                <button
                  key={opt.key}
                  onClick={() => setStrategy(opt.key)}
                  className={`strategy-card ${selected ? "selected" : "unselected"}`}
                  style={{ fontFamily: "'Nunito Sans', sans-serif" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 15, fontWeight: 800, color: selected ? "var(--selectedText)" : C.gold }}>
                    {opt.label}
                    {opt.star && <span aria-hidden="true" style={{ color: selected ? C.goldStrong : C.goldStrong, fontSize: 13 }}>★</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: selected ? "var(--selectedTextMuted)" : C.sub, marginTop: 4, lineHeight: 1.4 }}>{opt.note}</div>
                  {showPoolWarning && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: selected ? "#FBD9CE" : C.amber, marginTop: 6 }}>
                      ⚠️ {tr("recPoolWarningShort")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ton Ton's reference ratios — shown for both strategies, since Manual
              users benefit from the same guidance even while hand-tuning. */}
          <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 12, marginBottom: 14, fontSize: 12.5, color: C.ink, lineHeight: 1.55 }}>
            <div style={{ fontWeight: 800, color: C.gold, marginBottom: 2 }}>🐻 {tr("recSourceNote")}</div>
            <div style={{ color: C.sub, fontSize: 11.5, marginBottom: 10 }}>{tr("recSourceSub")}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              {[
                { color: TYPE_COLOR.infantry, name: tType("infantry", lang), range: "0.5–3%" },
                { color: TYPE_COLOR.lancer, name: tType("lancer", lang), range: "10–30%" },
                { color: TYPE_COLOR.marksman, name: tType("marksman", lang), range: "81%+" },
              ].map((row) => (
                <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 10, padding: "6px 10px" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: row.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, flex: 1 }}>{row.name}</span>
                  <span style={{ fontWeight: 800, color: C.gold }}>{row.range}</span>
                </div>
              ))}
            </div>

            <div style={{ fontWeight: 700, marginBottom: 6 }}>{tr("gen5Note")}</div>
            <div>{tr("recHeroNote")}</div>
          </div>

          {strategy === "manual" && (
            <div>
              <NumField label={tr("minMarchMarksmanLabel")} value={minMarchMarksman} onChange={setMinMarchMarksman} />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 5, marginBottom: 12 }}>{tr("minMarchMarksmanHelp")}</div>
              <Btn tone="gold" small onClick={handleAutoSplit}>{tr("autoSplitBtn")}</Btn>
              <div style={{ marginTop: 14 }}>
                <div key={flashSignal} className="flash-once">
                  <CompositionInputs capacity={capacity} mode={mode} setMode={setMode} ratio={ratio} setRatio={setRatio} exact={exact} setExact={setExact} target={targetManual} lang={lang} />
                </div>
              </div>
            </div>
          )}

          {strategy === "recommended" && (
            <div>
              {recBelow60k && (
                <div style={{ background: C.redBg, border: `1.5px solid ${C.red}`, borderRadius: 14, padding: 12, marginBottom: 14, fontSize: 12.5, color: C.red, fontWeight: 600, lineHeight: 1.5 }}>
                  ⚠️ {tr("recPoolWarningBanner")}
                </div>
              )}

              <RatioSlider
                label={`${tType("infantry", lang)} %`}
                colorDot={TYPE_COLOR.infantry}
                value={effectiveRecInfantryPct}
                min={MIN_JOINER_INFANTRY_PCT * 100}
                max={infantryEffectiveMax}
                step={0.1}
                onChange={setRecInfantryPct}
                warningEmoji={infantryStockLimited && effectiveRecInfantryPct >= infantryEffectiveMax - 0.05 ? "📦" : null}
                warningText={tr("infantryStockLimitWarning")}
              />
              <RatioSlider
                label={`${tType("lancer", lang)} %`}
                colorDot={TYPE_COLOR.lancer}
                value={effectiveRecLancerPct}
                min={5}
                max={lancerEffectiveMax}
                step={0.5}
                onChange={setRecLancerPct}
                warningEmoji={lancerStockLimited && effectiveRecLancerPct >= lancerEffectiveMax - 0.05 ? "📦" : null}
                warningText={tr("lancerStockLimitWarning")}
              />
              <AutoRatioBar
                label={`${tType("marksman", lang)} %`}
                colorDot={TYPE_COLOR.marksman}
                pct={recMarksmanPct}
                displayValue={`${recMarksmanPct.toFixed(1)}%`}
                autoLabel={tr("autoLabel")}
                warningEmoji={recBelow60k ? "⚠️" : null}
                warningText={recBelow60k ? tr("marksmanBelow60kWarning") : null}
              />
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: -6, marginBottom: 14 }}>
                {tType("marksman", lang)}: {fmt(recommendedTarget.marksman)}
              </div>

              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10, marginBottom: 10 }}>
                <TargetPreview target={recommendedTarget} lang={lang} />
              </div>
              {recommendedTarget.shortfall > 0 && (
                <div style={{ color: C.amber, fontWeight: 500, fontSize: 12.5, marginBottom: 10 }}>
                  {tFmt("spacesCantBeFilled", lang, { a: fmt(recommendedTarget.shortfall) })}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn tone="ghost" onClick={applyRecommendedToManual}>{tWord("useInManual", lang)}</Btn>
              </div>
            </div>
          )}
        </Card>

        {/* SQUAD RESULTS */}
        {strategy === "manual" && !targetManual.valid ? (
          <div style={{ fontSize: 12.5, color: C.cocoaDark, fontWeight: 700, textAlign: "center", padding: "14px 10px", background: C.amberBg, border: `1.5px solid ${C.goldStrong}`, borderRadius: 14 }}>
            ⚠ {tr("fixComposition")}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <SectionHeader title={`${tr("squadResults")} (${numSquads})`} />
              <Btn tone="ghost" small onClick={handleCopyPlan}>📋 {tr("copyPlan")}</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {computation.squads.map((sq, i) => (
                <SquadCard
                  key={i}
                  index={i + 1}
                  squadKey={i + 1}
                  result={sq}
                  invalid={false}
                  onAcceptFill={acceptFill}
                  onRemoveFill={removeFill}
                  tierLabel={null}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        )}

        {/* REMAINING TROOPS */}
        <Card>
          <SectionHeader title={tr("remainingTroopsHeading")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {TYPES.map((t) => (
              <div key={t} style={{ background: C.inputBg, border: `1.5px solid ${C.inputBorder}`, borderRadius: 16, padding: "10px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: TYPE_COLOR[t], display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{tType(t, lang)}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{fmt(remT11[t] + remT10[t] + remT9[t])}</div>
                <div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>
                  {hasHelios && <>T11 {fmt(remT11[t])} · </>}T10 {fmt(remT10[t])} · T9 {fmt(remT9[t])}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1.5px solid ${C.cardBorder}`, marginTop: 14, paddingTop: 12, fontSize: 12.5 }}>
            <Row label={tr("totalAvailableLabel")} value={fmt(totalAvailable)} />
            <Row label={tr("totalAllocatedLabel")} value={fmt(totalAllocated)} />
            <Row label={tr("totalRemainingLabel")} value={fmt(totalRemaining)} />
            <Row label={tr("capacityRequiredLabel")} value={fmt(totalCapacityRequired)} />
            <Row label={tr("fullSquadsLabel")} value={fullCount} />
            <Row label={tr("partialSquadsLabel")} value={partialCount} />
            <Row label={tr("unfilledSpacesLabel")} value={fmt(unfilledSpaces)} />
          </div>
        </Card>

        <div style={{ textAlign: "center", color: C.sub, fontSize: 11, paddingBottom: 20 }}>
          {tr("savedAutomatically")}
        </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: C.gold,
            color: C.surface,
            borderRadius: 999,
            padding: "10px 10px 10px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 6px 20px rgba(33,70,65,.35)",
            fontFamily: "'Nunito Sans', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            maxWidth: "calc(100% - 32px)",
          }}
        >
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button
              onClick={toast.onAction}
              style={{
                background: C.goldStrong,
                color: C.cocoaDark,
                border: "none",
                borderRadius: 999,
                padding: "7px 14px",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            onClick={dismissToast}
            aria-label="Dismiss"
            style={{ background: "none", border: "none", color: C.surface, opacity: 0.7, cursor: "pointer", fontSize: 16, padding: "4px 6px", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, tone }) {
  const color = tone === "green" ? C.green : tone === "amber" ? C.amber : C.ink;
  return (
    <div style={{ minWidth: 86, flexShrink: 0, padding: "0 12px" }}>
      <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, fontFamily: "'Nunito Sans', sans-serif" }}>{label}</div>
      <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontWeight: 800, fontSize: 22, lineHeight: "28px", letterSpacing: -0.2, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
function StatDivider() {
  return <div style={{ width: 1, background: C.cardBorder, flexShrink: 0 }} />;
}
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ color: C.sub }}>{label}</span>
      <span style={{ fontWeight: 500, color: C.ink }}>{value}</span>
    </div>
  );
}
