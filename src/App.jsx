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
const PRIORITY_ORDER = ["marksman", "lancer", "infantry"];
const TYPE_LABEL = { infantry: "Infantry", lancer: "Lancer", marksman: "Marksman" };
const TYPE_LABEL_KEY = { infantry: "infantryLabel", lancer: "lancerLabel", marksman: "marksmanLabel" };

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
  { code: "ko", label: "한국어" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
  { code: "pl", label: "Polski" },
  { code: "tr", label: "Türkçe" },
];

const TRANSLATIONS = {
  en: {
    troopPool: "Troop pool", troopPoolSub: "T10 is always used before T9 for the same troop type.",
    noTroops: "No troops entered yet — start here.", totalPoolLabel: "Total pool",
    clearAll: "Clear all troops", reset: "Reset",
    settings: "Settings", settingsSub: "Capacity applies to every joiner squad.",
    squadCapacity: "Squad capacity", numSquadsLabel: "Number of squads",
    rallyLeader: "Rally leader squad", rallyLeaderSub: "Reserves troops first, before the joiner squads are filled. Set your own composition.",
    rallyBaseCapacity: "Rally leader base capacity", cyrilleBoostLabel: "Cyrille Capacity Boost", snowApeBoostLabel: "Snow Ape Boost",
    ministerAppointed: "Minister of Strategy appointed", minister2000: "+2,000 capacity", minister3750: "+3,750 capacity",
    effectiveCapacity: "Effective capacity", percentages: "Percentages", exactAmounts: "Exact amounts",
    squadStrategy: "Squad strategy", squadStrategySub: "How the joiner composition is decided.",
    manual: "Manual", manualNote: "You set the exact split yourself.",
    recommended: "Recommended", recommendedNote: "One composition, same for every squad.",
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
    recSourceNote: "These starting ratios come from Ton Ton's guide — a solid baseline for most Rally Leaders.",
    recHeroNote: "The best ratio depends on your Rally Leader's heroes, hero gear, and chief gear — fine-tune the sliders below to match your own setup.",
    gen5Note: "This is the recommended ratio for Generation 5.",
    resetRatios: "Reset to Ton Ton's ratios",
  },
  it: {
    troopPool: "Riserva truppe", troopPoolSub: "Le T10 vengono sempre usate prima delle T9 per lo stesso tipo di truppa.",
    noTroops: "Nessuna truppa inserita — inizia qui.", totalPoolLabel: "Totale riserva",
    clearAll: "Cancella tutte le truppe", reset: "Reimposta",
    settings: "Impostazioni", settingsSub: "La capacità si applica a ogni squadra di supporto.",
    squadCapacity: "Capacità squadra", numSquadsLabel: "Numero di squadre",
    rallyLeader: "Squadra del capo raduno", rallyLeaderSub: "Preleva truppe per prima, prima che vengano riempite le squadre di supporto. Imposta tu la composizione.",
    rallyBaseCapacity: "Capacità base del capo raduno", cyrilleBoostLabel: "Bonus capacità Cyrille", snowApeBoostLabel: "Bonus Scimmia delle Nevi",
    ministerAppointed: "Ministro della Strategia nominato", minister2000: "+2.000 capacità", minister3750: "+3.750 capacità",
    effectiveCapacity: "Capacità effettiva", percentages: "Percentuali", exactAmounts: "Quantità esatte",
    squadStrategy: "Strategia squadra", squadStrategySub: "Come viene decisa la composizione delle squadre di supporto.",
    manual: "Manuale", manualNote: "Imposti tu la suddivisione esatta.",
    recommended: "Consigliata", recommendedNote: "Un'unica composizione, uguale per ogni squadra.",
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
    recSourceNote: "Queste percentuali di partenza vengono dalla guida di Ton Ton — una base solida per la maggior parte dei capi raduno.",
    recHeroNote: "Il rapporto migliore dipende dagli eroi del tuo capo raduno, dal loro equipaggiamento eroe e dall'equipaggiamento del capo — regola i cursori qui sotto in base alla tua configurazione.",
    gen5Note: "Questo è il rapporto consigliato per la Generazione 5.",
    resetRatios: "Ripristina le percentuali di Ton Ton",
  },
  es: {
    troopPool: "Reserva de tropas", troopPoolSub: "Las T10 siempre se usan antes que las T9 para el mismo tipo de tropa.",
    noTroops: "Aún no has introducido tropas — empieza aquí.", totalPoolLabel: "Total de la reserva",
    clearAll: "Borrar todas las tropas", reset: "Restablecer",
    settings: "Ajustes", settingsSub: "La capacidad se aplica a cada escuadrón de apoyo.",
    squadCapacity: "Capacidad del escuadrón", numSquadsLabel: "Número de escuadrones",
    rallyLeader: "Escuadrón del líder de asalto", rallyLeaderSub: "Toma tropas primero, antes de llenar los escuadrones de apoyo. Define tú la composición.",
    rallyBaseCapacity: "Capacidad base del líder de asalto", cyrilleBoostLabel: "Bonificación de capacidad Cyrille", snowApeBoostLabel: "Bonificación Mono de Nieve",
    ministerAppointed: "Ministro de Estrategia nombrado", minister2000: "+2.000 de capacidad", minister3750: "+3.750 de capacidad",
    effectiveCapacity: "Capacidad efectiva", percentages: "Porcentajes", exactAmounts: "Cantidades exactas",
    squadStrategy: "Estrategia de escuadrón", squadStrategySub: "Cómo se decide la composición de los escuadrones de apoyo.",
    manual: "Manual", manualNote: "Tú defines el reparto exacto.",
    recommended: "Recomendada", recommendedNote: "Una sola composición, igual para cada escuadrón.",
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
    recSourceNote: "Estos porcentajes iniciales vienen de la guía de Ton Ton — una base sólida para la mayoría de los líderes de asalto.",
    recHeroNote: "La mejor proporción depende de los héroes de tu líder de asalto, su equipo de héroe y el equipo de jefe — ajusta los controles de abajo según tu configuración.",
    gen5Note: "Esta es la proporción recomendada para la Generación 5.",
    resetRatios: "Restablecer a las proporciones de Ton Ton",
  },
  ko: {
    troopPool: "병력 보유량", troopPoolSub: "같은 병종이면 T9보다 T10을 항상 먼저 사용합니다.",
    noTroops: "아직 병력을 입력하지 않았습니다 — 여기서 시작하세요.", totalPoolLabel: "총 보유량",
    clearAll: "모든 병력 지우기", reset: "초기화",
    settings: "설정", settingsSub: "용량은 모든 지원 부대에 동일하게 적용됩니다.",
    squadCapacity: "부대 용량", numSquadsLabel: "부대 수",
    rallyLeader: "집결 대장 부대", rallyLeaderSub: "지원 부대를 채우기 전에 병력을 먼저 확보합니다. 구성은 직접 설정하세요.",
    rallyBaseCapacity: "집결 대장 기본 용량", cyrilleBoostLabel: "시릴 용량 보너스", snowApeBoostLabel: "눈원숭이 보너스",
    ministerAppointed: "전략 대신 임명됨", minister2000: "+2,000 용량", minister3750: "+3,750 용량",
    effectiveCapacity: "실효 용량", percentages: "비율", exactAmounts: "정확한 수량",
    squadStrategy: "부대 전략", squadStrategySub: "지원 부대의 구성을 결정하는 방식입니다.",
    manual: "수동", manualNote: "정확한 분배를 직접 설정합니다.",
    recommended: "추천", recommendedNote: "모든 부대에 동일한 구성을 적용합니다.",
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
    recSourceNote: "이 시작 비율은 Ton Ton의 가이드에서 가져온 것으로, 대부분의 집결 대장에게 적합한 기본값입니다.",
    recHeroNote: "최적의 비율은 집결 대장의 영웅, 영웅 장비, 사령관 장비에 따라 달라집니다 — 아래 슬라이더로 자신의 설정에 맞게 조정하세요.",
    gen5Note: "이것은 5세대(Generation 5)를 위한 권장 비율입니다.",
    resetRatios: "Ton Ton 비율로 재설정",
  },
  de: {
    troopPool: "Truppenbestand", troopPoolSub: "T10 wird beim gleichen Truppentyp immer vor T9 verwendet.",
    noTroops: "Noch keine Truppen eingegeben — hier beginnen.", totalPoolLabel: "Gesamtbestand",
    clearAll: "Alle Truppen löschen", reset: "Zurücksetzen",
    settings: "Einstellungen", settingsSub: "Die Kapazität gilt für jeden Verstärkungstrupp.",
    squadCapacity: "Truppkapazität", numSquadsLabel: "Anzahl der Trupps",
    rallyLeader: "Sammlungsanführer-Trupp", rallyLeaderSub: "Beansprucht zuerst Truppen, bevor die Verstärkungstrupps aufgefüllt werden. Lege die Zusammensetzung selbst fest.",
    rallyBaseCapacity: "Grundkapazität des Sammlungsanführers", cyrilleBoostLabel: "Cyrille-Kapazitätsbonus", snowApeBoostLabel: "Schneeaffe-Bonus",
    ministerAppointed: "Minister für Strategie ernannt", minister2000: "+2.000 Kapazität", minister3750: "+3.750 Kapazität",
    effectiveCapacity: "Effektive Kapazität", percentages: "Prozentsätze", exactAmounts: "Exakte Mengen",
    squadStrategy: "Truppstrategie", squadStrategySub: "Wie die Zusammensetzung der Verstärkungstrupps entschieden wird.",
    manual: "Manuell", manualNote: "Du legst die genaue Aufteilung selbst fest.",
    recommended: "Empfohlen", recommendedNote: "Eine Zusammensetzung, gleich für jeden Trupp.",
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
    recSourceNote: "Diese Ausgangswerte stammen aus Ton Tons Leitfaden — eine solide Basis für die meisten Sammlungsanführer.",
    recHeroNote: "Das beste Verhältnis hängt von den Helden deines Sammlungsanführers, deren Heldenausrüstung und der Anführerausrüstung ab — passe die Regler unten an dein eigenes Setup an.",
    gen5Note: "Dies ist das empfohlene Verhältnis für Generation 5.",
    resetRatios: "Auf Ton Tons Verhältnisse zurücksetzen",
  },
  ru: {
    troopPool: "Резерв войск", troopPoolSub: "Войска T10 всегда используются раньше T9 для одного типа войск.",
    noTroops: "Войска ещё не введены — начните здесь.", totalPoolLabel: "Всего в резерве",
    clearAll: "Очистить все войска", reset: "Сбросить",
    settings: "Настройки", settingsSub: "Вместимость применяется к каждому отряду поддержки.",
    squadCapacity: "Вместимость отряда", numSquadsLabel: "Количество отрядов",
    rallyLeader: "Отряд лидера сбора", rallyLeaderSub: "Забирает войска первым, до заполнения отрядов поддержки. Состав задаётся вручную.",
    rallyBaseCapacity: "Базовая вместимость лидера сбора", cyrilleBoostLabel: "Бонус вместимости от Сирилла", snowApeBoostLabel: "Бонус Снежной обезьяны",
    ministerAppointed: "Назначен министр стратегии", minister2000: "+2000 вместимости", minister3750: "+3750 вместимости",
    effectiveCapacity: "Фактическая вместимость", percentages: "Проценты", exactAmounts: "Точные значения",
    squadStrategy: "Стратегия отряда", squadStrategySub: "Как определяется состав отрядов поддержки.",
    manual: "Вручную", manualNote: "Вы сами задаёте точное распределение.",
    recommended: "Рекомендуемая", recommendedNote: "Один и тот же состав для каждого отряда.",
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
    recSourceNote: "Эти начальные соотношения взяты из руководства Ton Ton — надёжная основа для большинства лидеров сбора.",
    recHeroNote: "Лучшее соотношение зависит от героев вашего лидера сбора, их снаряжения героев и снаряжения командира — настройте ползунки ниже под свою конфигурацию.",
    gen5Note: "Это рекомендуемое соотношение для Поколения 5.",
    resetRatios: "Сбросить к соотношениям Ton Ton",
  },
  pl: {
    troopPool: "Pula wojsk", troopPoolSub: "Wojska T10 są zawsze używane przed T9 dla tego samego typu wojsk.",
    noTroops: "Nie wprowadzono jeszcze wojsk — zacznij tutaj.", totalPoolLabel: "Łączna pula",
    clearAll: "Wyczyść wszystkie wojska", reset: "Resetuj",
    settings: "Ustawienia", settingsSub: "Pojemność dotyczy każdego oddziału wsparcia.",
    squadCapacity: "Pojemność oddziału", numSquadsLabel: "Liczba oddziałów",
    rallyLeader: "Oddział lidera zgrupowania", rallyLeaderSub: "Pobiera wojska jako pierwszy, zanim wypełnione zostaną oddziały wsparcia. Skład ustawiasz sam.",
    rallyBaseCapacity: "Podstawowa pojemność lidera zgrupowania", cyrilleBoostLabel: "Bonus pojemności Cyrille", snowApeBoostLabel: "Bonus Śnieżnej Małpy",
    ministerAppointed: "Minister Strategii mianowany", minister2000: "+2000 pojemności", minister3750: "+3750 pojemności",
    effectiveCapacity: "Efektywna pojemność", percentages: "Procenty", exactAmounts: "Dokładne ilości",
    squadStrategy: "Strategia oddziału", squadStrategySub: "Jak ustalany jest skład oddziałów wsparcia.",
    manual: "Ręczny", manualNote: "Sam ustalasz dokładny podział.",
    recommended: "Zalecany", recommendedNote: "Jeden skład, taki sam dla każdego oddziału.",
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
    recSourceNote: "Te początkowe proporcje pochodzą z poradnika Ton Ton — solidna baza dla większości liderów zgrupowania.",
    recHeroNote: "Najlepsza proporcja zależy od bohaterów twojego lidera zgrupowania, ich ekwipunku bohatera i ekwipunku dowódcy — dostosuj poniższe suwaki do swojej konfiguracji.",
    gen5Note: "To jest zalecana proporcja dla Generacji 5.",
    resetRatios: "Przywróć proporcje Ton Ton",
  },
  tr: {
    troopPool: "Asker havuzu", troopPoolSub: "Aynı asker türü için T10 her zaman T9'dan önce kullanılır.",
    noTroops: "Henüz asker girilmedi — buradan başlayın.", totalPoolLabel: "Toplam havuz",
    clearAll: "Tüm askerleri temizle", reset: "Sıfırla",
    settings: "Ayarlar", settingsSub: "Kapasite her destek birliği için geçerlidir.",
    squadCapacity: "Birlik kapasitesi", numSquadsLabel: "Birlik sayısı",
    rallyLeader: "Toplanma lideri birliği", rallyLeaderSub: "Destek birlikleri doldurulmadan önce askerleri ilk o alır. Bileşimi kendiniz belirlersiniz.",
    rallyBaseCapacity: "Toplanma liderinin temel kapasitesi", cyrilleBoostLabel: "Cyrille Kapasite Artışı", snowApeBoostLabel: "Kar Maymunu Artışı",
    ministerAppointed: "Strateji Bakanı atandı", minister2000: "+2.000 kapasite", minister3750: "+3.750 kapasite",
    effectiveCapacity: "Etkin kapasite", percentages: "Yüzdeler", exactAmounts: "Kesin miktarlar",
    squadStrategy: "Birlik stratejisi", squadStrategySub: "Destek birliklerinin bileşiminin nasıl belirlendiği.",
    manual: "Manuel", manualNote: "Kesin dağılımı kendiniz belirlersiniz.",
    recommended: "Önerilen", recommendedNote: "Her birlik için aynı, tek bir bileşim.",
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
    recSourceNote: "Bu başlangıç oranları Ton Ton'un rehberinden alınmıştır — çoğu toplanma lideri için sağlam bir temel.",
    recHeroNote: "En iyi oran, toplanma liderinizin kahramanlarına, kahraman ekipmanına ve lider ekipmanına bağlıdır — kendi kurulumunuza göre aşağıdaki kaydırıcıları ayarlayın.",
    gen5Note: "Bu, 5. Nesil için önerilen orandır.",
    resetRatios: "Ton Ton oranlarına sıfırla",
  },
};

function tType(type, lang) {
  const key = TYPE_LABEL_KEY[type];
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || TYPE_LABEL[type];
}
function tWord(key, lang) {
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
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
const MIN_JOINER_MARKSMAN = 60000; // both Recommended and Tiered joiner squads guarantee at least this much Marksman, stock permitting
const MAX_JOINER_INFANTRY_PCT = 0.03; // Infantry is capped at 3% of squad capacity for both Recommended and Tiered
const MIN_JOINER_INFANTRY_PCT = 0.005; // ...and floored at 0.5% of squad capacity, stock permitting
const MIN_JOINER_LANCER_PCT = 0.10; // Lancer targets at least 10% of capacity when the pool has enough troops to support it, for both Recommended and Tiered

/* Builds a per-squad target that (1) guarantees each type's floor first —
   capped by what `divisor` squads can actually draw from the pool — then
   (2) spends whatever capacity is left in Marksman > Lancer > Infantry
   priority order, honoring an optional per-type `caps` ceiling (e.g. Infantry
   never exceeding 3% of capacity) even during that extra-fill phase. Used for
   both the Recommended and Tiered strategies so floors/caps are real,
   guaranteed constraints rather than a post-hoc warning. */
function priorityTargetWithFloors(capacity, available, divisor, floors, caps = {}) {
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

  PRIORITY_ORDER.forEach((t) => {
    if (remaining <= 0) return;
    const capLimit = caps[t] !== undefined ? caps[t] : Infinity;
    const extra = Math.max(0, Math.min(maxByStock[t], capLimit) - result[t]);
    const use = Math.min(extra, remaining);
    result[t] += use;
    remaining -= use;
  });

  return { infantry: result.infantry, lancer: result.lancer, marksman: result.marksman, valid: true, shortfall: Math.max(0, remaining), floorsMet };
}

/* Allocate ONE squad's target against shared pools, then apply accepted
   manual fills, then compute fresh fill suggestions for any leftover space. */
function allocateSquad(capacity, target, pools, acceptedFills = []) {
  const breakdown = {};
  let totalAllocated = 0;

  TYPES.forEach((t) => {
    const want = target[t] || 0;
    const t10Alloc = Math.min(want, pools.t10[t]);
    pools.t10[t] -= t10Alloc;
    const stillWant = want - t10Alloc;
    const t9Alloc = Math.min(stillWant, pools.t9[t]);
    pools.t9[t] -= t9Alloc;
    const total = t10Alloc + t9Alloc;
    breakdown[t] = { target: want, t10: t10Alloc, t9: t9Alloc, total, shortage: Math.max(0, want - total) };
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
    for (const tier of ["t10", "t9"]) {
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

  const t10Used = TYPES.reduce((s, t) => s + breakdown[t].t10, 0);
  const t9Used = TYPES.reduce((s, t) => s + breakdown[t].t9, 0);

  return {
    breakdown,
    totalAllocated,
    capacityRemaining,
    status,
    suggestions,
    appliedFills,
    pctOf: (n) => (totalAllocated > 0 ? (n / totalAllocated) * 100 : 0),
    t10Pct: totalAllocated > 0 ? (t10Used / totalAllocated) * 100 : 0,
    t9Pct: totalAllocated > 0 ? (t9Used / totalAllocated) * 100 : 0,
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
function RatioSlider({ label, colorDot, value, min, max, step, onChange, suffix = "%" }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: C.gold }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: colorDot, display: "inline-block" }} />
          {label}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ratio-slider"
        aria-label={label}
      />
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
          <div style={{ fontWeight: 600, color: C.gold }}>Squad {index}</div>
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
          const t9Pct = b.total > 0 ? (b.t9 / b.total) * 100 : 0;
          return (
            <div key={t} style={{ background: C.surface, border: `1.5px solid ${b.t9 > 0 ? C.t9Amber : C.cardBorder}`, borderRadius: 14, padding: "11px 9px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: 0.3 }}>{tType(t, lang)}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{fmt(b.total)}</div>
              {b.total > 0 && (
                <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginTop: 6, marginBottom: 6, background: "var(--tierTrackBg)" }}>
                  {b.t10 > 0 && <div style={{ width: `${100 - t9Pct}%`, background: C.teal }} />}
                  {b.t9 > 0 && <div style={{ width: `${t9Pct}%`, background: C.t9Amber }} />}
                </div>
              )}
              <div style={{ fontSize: 10.5 }}>
                <span style={{ color: b.t10 > 0 ? C.teal : C.sub, fontWeight: b.t10 > 0 ? 700 : 400 }}>T10 {fmt(b.t10)}</span>
                <span style={{ color: C.sub }}> · </span>
                <span style={{ color: b.t9 > 0 ? C.t9Amber : C.sub, fontWeight: b.t9 > 0 ? 700 : 400 }}>T9 {fmt(b.t9)}</span>
              </div>
              {b.shortage > 0 && <div style={{ fontSize: 10.5, color: C.red, fontWeight: 600, marginTop: 2 }}>short {fmt(b.shortage)}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>
        Comp: {result.pctOf(result.breakdown.infantry.total).toFixed(1)}% Inf · {result.pctOf(result.breakdown.lancer.total).toFixed(1)}% Lan ·{" "}
        {result.pctOf(result.breakdown.marksman.total).toFixed(1)}% Mark &nbsp;|&nbsp; T10 {result.t10Pct.toFixed(0)}% / T9 {result.t9Pct.toFixed(0)}%
      </div>

      {result.appliedFills && result.appliedFills.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {result.appliedFills.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: "6px 6px 6px 10px", fontSize: 11.5 }}>
              <span style={{ color: C.gold, fontWeight: 600 }}>+ {fmt(f.applied)} {f.tier.toUpperCase()} {tType(f.type, lang)} added manually</span>
              <button onClick={() => onRemoveFill(squadKey, i)} aria-label="Remove this manual fill" style={{ background: "none", border: "none", color: C.red, fontWeight: 600, cursor: "pointer", fontSize: 15, padding: "6px 8px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {result.capacityRemaining > 0 && (
        <div style={{ background: bg, borderRadius: 14, padding: "10px 12px", fontSize: 12, color: C.ink }}>
          <div style={{ fontWeight: 600, marginBottom: 7 }}>Fill remaining {fmt(result.capacityRemaining)}:</div>
          {result.suggestions.length === 0 ? (
            <div style={{ color: C.red, fontWeight: 500 }}>No troops left in any pool to fill this space.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.suggestions.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>{fmt(s.amount)} {s.tier.toUpperCase()} {tType(s.type, lang)} available</span>
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
            <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 500 }}>Remaining to allocate: {Math.max(0, 100 - ratioSum)}%</span>
            {!target.valid ? (
              <span style={{ fontSize: 12, color: C.red, fontWeight: 500 }}>✕ Total {ratioSum.toFixed(0)}% — must equal 100%</span>
            ) : (
              <span style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>✓ Totals 100%</span>
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
              {target.total < capacity ? `${fmt(capacity - target.total)} spaces remaining below capacity.` : `Exceeds capacity by ${fmt(target.total - capacity)}.`}
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
   MAIN APP
   ============================================================ */
const SAMPLE = {
  t10: { infantry: 197368, lancer: 168958, marksman: 306838 },
  t9: { infantry: 97133, lancer: 98576, marksman: 11916 },
};
const EMPTY = { infantry: 0, lancer: 0, marksman: 0 };

const STORAGE_KEY = "bearTrapCalculator:v1";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // private browsing / storage disabled / corrupted data — just fall back to defaults
  }
}

export default function App() {
  // Loaded once on first render; every piece of state below falls back to
  // its normal default if nothing was saved (or saving is unavailable).
  const [saved] = useState(loadSaved);

  const [capacity, setCapacity] = useState(saved?.capacity ?? 110000);
  const [numSquads, setNumSquads] = useState(saved?.numSquads ?? 6);
  const [t10, setT10] = useState(saved?.t10 ?? SAMPLE.t10);
  const [t9, setT9] = useState(saved?.t9 ?? SAMPLE.t9);

  // Infantry per joiner squad is bounded between 0.5% and 3% of that squad's capacity — used by both Recommended and Tiered.
  const infantryCap = Math.round(capacity * MAX_JOINER_INFANTRY_PCT);
  const infantryFloor = Math.max(DIVERSITY_FLOOR, Math.round(capacity * MIN_JOINER_INFANTRY_PCT));

  // Recommended strategy's ratios are adjustable — Ton Ton's guide is the starting point
  // (0.5% Infantry, 10% Lancer, Marksman fills the rest), but sliders let the player
  // tune them for their own Rally Leader heroes/gear while staying inside the rules:
  // Infantry can't leave its 0.5%–3% band, and the Lancer slider's own max shrinks so
  // Marksman can never be dragged below its guaranteed 60,000 minimum.
  const [recInfantryPct, setRecInfantryPct] = useState(saved?.recInfantryPct ?? MIN_JOINER_INFANTRY_PCT * 100);
  const [recLancerPct, setRecLancerPct] = useState(saved?.recLancerPct ?? MIN_JOINER_LANCER_PCT * 100);
  const maxLancerPctAllowed =
    capacity > 0 ? Math.max(5, Math.min(30, 100 * (1 - recInfantryPct / 100 - MIN_JOINER_MARKSMAN / capacity))) : 30;
  const effectiveLancerPct = Math.min(recLancerPct, maxLancerPctAllowed);

  // Manual composition (used when strategy === 'manual')
  const [mode, setMode] = useState(saved?.mode ?? "ratio");
  const [ratio, setRatio] = useState(saved?.ratio ?? { infantry: 2, lancer: 15, marksman: 83 });
  const [exact, setExact] = useState(saved?.exact ?? { infantry: 2200, lancer: 16500, marksman: 91300 });

  // Squad strategy: manual | recommended | tiered
  const [strategy, setStrategy] = useState(saved?.strategy ?? "manual");
  const [numStronger, setNumStronger] = useState(saved?.numStronger ?? 5);
  // Infantry amount the player finds acceptable to always include per
  // Stronger squad — reserved before Marksman/Lancer fill the rest.
  const [strongInfantry, setStrongInfantry] = useState(saved?.strongInfantry ?? 0);
  // Minimum Marksman per squad the player wants the Weaker tier to hit.
  const [minWeakMarksman, setMinWeakMarksman] = useState(saved?.minWeakMarksman ?? MIN_JOINER_MARKSMAN);

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

  // Auto-save everything the player has entered so it survives a refresh.
  // Runs after every relevant change; silently no-ops if storage is unavailable.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          capacity, numSquads, t10, t9,
          mode, ratio, exact,
          strategy, numStronger, strongInfantry, minWeakMarksman,
          rallyCapacity, cyrilleBoost, snowApeBoost, ministerBoost, rallyMode, rallyRatio, rallyExact,
          advancedOpen, darkMode, lang, fills, recInfantryPct, recLancerPct,
        })
      );
    } catch {
      // storage full or disabled — nothing to do, the app still works without it
    }
  }, [
    capacity, numSquads, t10, t9,
    mode, ratio, exact,
    strategy, numStronger, strongInfantry, minWeakMarksman,
    rallyCapacity, cyrilleBoost, snowApeBoost, ministerBoost, rallyMode, rallyRatio, rallyExact,
    advancedOpen, darkMode, lang, fills, recInfantryPct, recLancerPct,
  ]);

  const tr = (key) => (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;

  const targetManual = useMemo(() => computeTarget(capacity, mode, ratio, exact), [capacity, mode, ratio, exact]);
  const effectiveRallyCapacity = rallyCapacity + cyrilleBoost + snowApeBoost + ministerBoost;

  const rallyTarget = useMemo(() => computeTarget(effectiveRallyCapacity, rallyMode, rallyRatio, rallyExact), [effectiveRallyCapacity, rallyMode, rallyRatio, rallyExact]);

  // Rally leader consumes from the pool first, independent of joiner strategy.
  const rallyComputation = useMemo(() => {
    const pools = { t10: { ...t10 }, t9: { ...t9 } };
    let result = null;
    if (rallyTarget.valid) result = allocateSquad(effectiveRallyCapacity, rallyTarget, pools, fills["rally"] || []);
    return { result, pools };
  }, [t10, t9, rallyTarget, effectiveRallyCapacity, fills]);

  const joinerAvailable = useMemo(() => {
    const p = rallyComputation.pools;
    const obj = {};
    TYPES.forEach((t) => (obj[t] = p.t10[t] + p.t9[t]));
    return obj;
  }, [rallyComputation]);

  const numStrongerClamped = Math.min(Math.max(1, numStronger), Math.max(1, numSquads - 1));
  const numWeaker = Math.max(0, numSquads - numStrongerClamped);

  const lancerFloor = Math.max(DIVERSITY_FLOOR, Math.round(capacity * MIN_JOINER_LANCER_PCT));

  const recommendedTarget = useMemo(
    () =>
      priorityTargetWithFloors(
        capacity,
        joinerAvailable,
        numSquads,
        { infantry: Math.max(DIVERSITY_FLOOR, Math.round(capacity * (recInfantryPct / 100))), lancer: Math.max(DIVERSITY_FLOOR, Math.round(capacity * (effectiveLancerPct / 100))), marksman: MIN_JOINER_MARKSMAN },
        { infantry: infantryCap }
      ),
    [capacity, joinerAvailable, numSquads, infantryCap, recInfantryPct, effectiveLancerPct]
  );

  // Marksman is guaranteed a floor and gets fill priority for whatever's left
  // (so it soaks up as much of the squad as the pool allows once Lancer's
  // ratio target and Infantry's range are satisfied). Infantry is bounded
  // between 0.5% and 3% of capacity; Lancer targets ~10% of capacity so it
  // still follows the ratio guidance whenever the pool has enough troops.
  const strongFloors = useMemo(
    () => ({ infantry: Math.min(Math.max(infantryFloor, strongInfantry), infantryCap), lancer: lancerFloor, marksman: MIN_JOINER_MARKSMAN }),
    [strongInfantry, infantryCap, infantryFloor, lancerFloor]
  );
  const weakFloors = useMemo(
    () => ({ infantry: infantryFloor, lancer: lancerFloor, marksman: Math.max(MIN_JOINER_MARKSMAN, minWeakMarksman) }),
    [minWeakMarksman, infantryFloor, lancerFloor]
  );

  // Reserve the Weaker tier's guaranteed minimums FIRST, so the Stronger
  // tier's own allocation is computed against what's left over — this is
  // what actually readjusts Stronger squads down rather than just flagging
  // a Weaker-tier shortfall after the fact.
  const availableForStrong = useMemo(() => {
    const obj = {};
    TYPES.forEach((t) => (obj[t] = Math.max(0, joinerAvailable[t] - weakFloors[t] * numWeaker)));
    return obj;
  }, [joinerAvailable, weakFloors, numWeaker]);

  const tieredStrong = useMemo(
    () => priorityTargetWithFloors(capacity, availableForStrong, numStrongerClamped, strongFloors, { infantry: infantryCap }),
    [capacity, availableForStrong, numStrongerClamped, strongFloors, infantryCap]
  );

  const actualAvailableForWeak = useMemo(() => {
    const obj = {};
    TYPES.forEach((t) => (obj[t] = Math.max(0, joinerAvailable[t] - tieredStrong[t] * numStrongerClamped)));
    return obj;
  }, [joinerAvailable, tieredStrong, numStrongerClamped]);

  const tieredWeak = useMemo(
    () =>
      numWeaker > 0
        ? priorityTargetWithFloors(capacity, actualAvailableForWeak, numWeaker, weakFloors, { infantry: infantryCap })
        : { infantry: 0, lancer: 0, marksman: 0, valid: true, shortfall: 0, floorsMet: { infantry: true, lancer: true, marksman: true } },
    [capacity, actualAvailableForWeak, numWeaker, weakFloors, infantryCap]
  );

  const computation = useMemo(() => {
    const pools = { t10: { ...rallyComputation.pools.t10 }, t9: { ...rallyComputation.pools.t9 } };
    const squads = [];
    for (let i = 0; i < numSquads; i++) {
      let tgt;
      if (strategy === "manual") tgt = targetManual;
      else if (strategy === "recommended") tgt = recommendedTarget;
      else tgt = i < numStrongerClamped ? tieredStrong : tieredWeak;

      if (!tgt.valid) {
        squads.push(null);
        continue;
      }
      squads.push(allocateSquad(capacity, tgt, pools, fills[i + 1] || []));
    }
    return { squads, pools };
  }, [rallyComputation, numSquads, strategy, targetManual, recommendedTarget, tieredStrong, tieredWeak, numStrongerClamped, capacity, fills]);

  const totalAvailable = TYPES.reduce((s, t) => s + t10[t] + t9[t], 0);
  const rallyAllocated = rallyComputation.result ? rallyComputation.result.totalAllocated : 0;
  const totalAllocated = computation.squads.reduce((s, sq) => s + (sq ? sq.totalAllocated : 0), 0) + rallyAllocated;
  const totalRemaining = totalAvailable - totalAllocated;
  const totalCapacityRequired = capacity * numSquads + effectiveRallyCapacity;
  const fullCount = computation.squads.filter((s) => s && s.status === "full").length;
  const partialCount = computation.squads.filter((s) => s && s.status === "partial").length;
  const unfilledSpaces = Math.max(0, totalCapacityRequired - totalAllocated);
  const noTroopsEntered = totalAvailable === 0;

  function clearTroops() {
    setT10(EMPTY);
    setT9(EMPTY);
    setFills({});
  }
  function resetAll() {
    setCapacity(110000);
    setNumSquads(6);
    setT10(SAMPLE.t10);
    setT9(SAMPLE.t9);
    setMode("ratio");
    setRatio({ infantry: 2, lancer: 15, marksman: 83 });
    setExact({ infantry: 2200, lancer: 16500, marksman: 91300 });
    setStrategy("manual");
    setNumStronger(5);
    setStrongInfantry(0);
    setMinWeakMarksman(MIN_JOINER_MARKSMAN);
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
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable — state is already reset regardless
    }
  }
  function applyRecommendedToManual() {
    setStrategy("manual");
    setMode("exact");
    setExact({ infantry: recommendedTarget.infantry, lancer: recommendedTarget.lancer, marksman: recommendedTarget.marksman });
  }

  const remT10 = computation.pools.t10;
  const remT9 = computation.pools.t9;

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
          height: 8px;
          border-radius: 999px;
          background: var(--tierTrackBg);
          outline: none;
          cursor: pointer;
          margin: 0;
        }
        .ratio-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: ${C.goldStrong};
          border: 3px solid ${C.surface};
          box-shadow: 0 2px 6px rgba(33,70,65,.3);
          cursor: pointer;
        }
        .ratio-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: ${C.goldStrong};
          border: 3px solid ${C.surface};
          box-shadow: 0 2px 6px rgba(33,70,65,.3);
          cursor: pointer;
        }
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
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <Btn tone="ghost" small onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? `☀️ ${tr("lightToggle")}` : `🌙 ${tr("darkToggle")}`}
            </Btn>
            <BearMascot className="header-bear" />
          </div>
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
          {/* TROOP POOL + SETTINGS — paired side by side on wide screens */}
          <div className="section-grid">
          <Card>
          <SectionHeader step={1} title={tr("troopPool")} sub={tr("troopPoolSub")} />
          {noTroopsEntered && (
            <div style={{ background: C.amberBg, color: C.amber, borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
              {tr("noTroops")}
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

        {/* SETTINGS */}
        <Card>
          <SectionHeader step={2} title={tr("settings")} sub={tr("settingsSub")} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <NumField label={tr("squadCapacity")} value={capacity} onChange={setCapacity} />
            <NumField label={tr("numSquadsLabel")} value={numSquads} onChange={setNumSquads} />
          </div>
        </Card>
          </div>

        {/* RALLY LEADER */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setAdvancedOpen(!advancedOpen)}>
            <SectionHeader step={3} title={tr("rallyLeader")} sub={tr("rallyLeaderSub")} />
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

        {/* SQUAD STRATEGY */}
        <Card>
          <SectionHeader step={4} title={tr("squadStrategy")} sub={tr("squadStrategySub")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              { key: "manual", label: tr("manual"), note: tr("manualNote"), star: false },
              { key: "recommended", label: tr("recommended"), note: tr("recommendedNote"), star: true },
              { key: "tiered", label: tr("tiered"), note: tr("tieredNote"), star: false },
            ].map((opt) => {
              const selected = strategy === opt.key;
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
                </button>
              );
            })}
          </div>

          {strategy === "manual" && (
            <CompositionInputs capacity={capacity} mode={mode} setMode={setMode} ratio={ratio} setRatio={setRatio} exact={exact} setExact={setExact} target={targetManual} lang={lang} />
          )}

          {strategy === "recommended" && (
            <div>
              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 12, marginBottom: 14, fontSize: 12.5, color: C.ink, lineHeight: 1.55 }}>
                <div style={{ fontWeight: 800, color: C.gold, marginBottom: 4 }}>🐻 {tr("recSourceNote")}</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{tr("gen5Note")}</div>
                <div>{tr("recHeroNote")}</div>
              </div>

              <RatioSlider
                label={`${tType("infantry", lang)} %`}
                colorDot={TYPE_COLOR.infantry}
                value={recInfantryPct}
                min={MIN_JOINER_INFANTRY_PCT * 100}
                max={MAX_JOINER_INFANTRY_PCT * 100}
                step={0.1}
                onChange={setRecInfantryPct}
              />
              <RatioSlider
                label={`${tType("lancer", lang)} %`}
                colorDot={TYPE_COLOR.lancer}
                value={effectiveLancerPct}
                min={5}
                max={maxLancerPctAllowed}
                step={0.5}
                onChange={setRecLancerPct}
              />
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: -6, marginBottom: 14 }}>
                {tType("marksman", lang)}: {fmt(recommendedTarget.marksman)} — fills whatever's left after Infantry and Lancer, never below {fmt(MIN_JOINER_MARKSMAN)}.
              </div>

              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10, marginBottom: 10 }}>
                <TargetPreview target={recommendedTarget} lang={lang} />
              </div>
              {!recommendedTarget.floorsMet.marksman && (
                <div style={{ fontSize: 12, color: C.red, fontWeight: 500, marginBottom: 10 }}>
                  Only {fmt(recommendedTarget.marksman)} Marksman available per squad — pool is short of the {fmt(MIN_JOINER_MARKSMAN)} minimum requested.
                </div>
              )}
              {recommendedTarget.shortfall > 0 && (
                <div style={{ color: C.amber, fontWeight: 500, fontSize: 12.5, marginBottom: 10 }}>
                  {fmt(recommendedTarget.shortfall)} spaces per squad can't be filled — not enough total troops.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn tone="ghost" onClick={applyRecommendedToManual}>Use these numbers in Manual / Exact mode</Btn>
              </div>
            </div>
          )}

          {strategy === "tiered" && (
            <div>
              <div style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 14, padding: 10, marginBottom: 14, fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
                <strong>How this works:</strong>
                <div>1. Stronger squads fill first — all identical to each other.</div>
                <div>2. Weaker squads split whatever's left — also identical to each other.</div>
                <div>3. Every squad keeps a little Infantry + Lancer, then loads up on Marksman for damage.</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>Number of Stronger squads</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Btn tone="ghost" small onClick={() => setNumStronger(Math.max(1, numStronger - 1))}>−</Btn>
                  <span style={{ fontWeight: 600, fontSize: 15, minWidth: 18, textAlign: "center", color: C.ink }}>{numStrongerClamped}</span>
                  <Btn tone="ghost" small onClick={() => setNumStronger(Math.min(numSquads - 1, numStronger + 1))}>+</Btn>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 14 }}>
                Squads 1–{numStrongerClamped} are Stronger. Squads {numStrongerClamped + 1}–{numSquads} are Weaker.
              </div>

              <NumField label="Acceptable Infantry per Stronger squad" value={strongInfantry} onChange={setStrongInfantry} />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 5, marginBottom: 14 }}>Guaranteed in every Stronger squad first — kept between 0.5% and 3% of squad capacity ({fmt(infantryFloor)}–{fmt(infantryCap)}).</div>

              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 800, lineHeight: "20px", color: C.gold, marginBottom: 6 }}>Stronger squad composition</div>
              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10, marginBottom: 14 }}>
                <TargetPreview target={tieredStrong} lang={lang} />
                {!tieredStrong.floorsMet.infantry && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 500, marginTop: 6 }}>
                    Only {fmt(tieredStrong.infantry)} Infantry available per squad (requested {fmt(strongInfantry)}).
                  </div>
                )}
                {!tieredStrong.floorsMet.marksman && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 500, marginTop: 6 }}>
                    Only {fmt(tieredStrong.marksman)} Marksman available per squad — pool is short of the {fmt(MIN_JOINER_MARKSMAN)} minimum.
                  </div>
                )}
              </div>

              <NumField label="Minimum acceptable Marksman per Weaker squad" value={minWeakMarksman} onChange={setMinWeakMarksman} />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 5, marginBottom: 14 }}>Guaranteed in every Weaker squad — Stronger squads give up Marksman first if needed. Minimum {fmt(MIN_JOINER_MARKSMAN)}.</div>

              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 800, lineHeight: "20px", color: C.gold, marginBottom: 6 }}>Weaker squad composition</div>
              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10 }}>
                <TargetPreview target={tieredWeak} lang={lang} />
                {!tieredWeak.floorsMet.marksman && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 500, marginTop: 6 }}>
                    Only {fmt(tieredWeak.marksman)} Marksman available per squad — total pool is short of the {fmt(minWeakMarksman)} requested even after Stronger squads yield.
                  </div>
                )}
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
            <SectionHeader title={`${tr("squadResults")} (${numSquads})`} />
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
                  tierLabel={strategy === "tiered" ? (i < numStrongerClamped ? "stronger" : "weaker") : null}
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
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{fmt(remT10[t] + remT9[t])}</div>
                <div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>T10 {fmt(remT10[t])} · T9 {fmt(remT9[t])}</div>
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
