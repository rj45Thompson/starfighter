/* lexicon.js - EVERY hand-written word list the engine uses, in one file, exported so the page
 * can print all of it under "hand-written" (NO_TOYS rule 5). Nothing about any specific entity is
 * here; these are question grammar, not answers.
 */

/* words that frame a question and are never part of a name on their own */
export const FRAMING = new Set((
  "what whats which who whom whose why where when how is are was were am be been being " +
  "do does did the a an of in on at to from by for with as into about tell me please can you " +
  "know there it its this that these those and or"
).split(" "));

/* verbs / phrases that name a relation. Each row: regex over the lower-cased question, the
 * Wikidata property it asks for, and a short reason shown to the reader. Property aliases from
 * Wikidata itself (thousands of them, read from index.json) cover the NOUN forms - "capital",
 * "head of government", "place of birth" - this list is only the VERB forms Wikidata does not
 * alias. Kept short on purpose; a verb not here is reported as unplaced, never guessed. */
export const VERB_RELATIONS = [
  { re: /\b(wrote|written by|author of|authored)\b/, pid: 50, why: "wrote -> author (P50)" },
  { re: /\bdirected( by)?\b/, pid: 57, why: "directed -> director (P57)" },
  { re: /\b(founded|established|created|set up)( by)?\b/, pid: 112, why: "founded -> founded by (P112)" },
  { re: /\b(born|birthplace)\b/, pid: 19, why: "born -> place of birth (P19)", date: 569 },
  { re: /\b(died|death|die)\b/, pid: 20, why: "died -> place of death (P20)", date: 570 },
  { re: /\b(married( to)?|spouse|wife|husband)\b/, pid: 26, why: "married -> spouse (P26)" },
  { re: /\b(composed|composer)\b/, pid: 86, why: "composed -> composer (P86)" },
  { re: /\b(painted|sculpted|made by|creator)\b/, pid: 170, why: "made -> creator (P170)" },
  { re: /\b(developed|developer)\b/, pid: 178, why: "developed -> developer (P178)" },
  { re: /\b(published|publisher)\b/, pid: 123, why: "published -> publisher (P123)" },
  { re: /\b(stars?|starring|starred|cast)\b/, pid: 161, why: "starring -> cast member (P161)" },
  { re: /\b(plays? for|played for)\b/, pid: 54, why: "plays for -> member of sports team (P54)" },
  { re: /\b(languages?\s+(?:is|are|was|were)\s+spoken|spoken|speaks?)\b/, pid: 37, alts: [1412], why: "language spoken -> official language (P37), else languages spoken (P1412)" },
  { re: /\b(discovered|invented|discoverer|inventor)\b/, pid: 61, why: "discovered -> discoverer or inventor (P61)" },
  { re: /\b(performed|performer|sung by|sings?)\b/, pid: 175, why: "performed -> performer (P175)" },
  { re: /\b(located|location|situated)\b/, pid: 276, why: "located -> location (P276)" },
  { re: /\b(occupation|job|profession|does for a living)\b/, pid: 106, why: "occupation (P106)" },
  { re: /\b(citizen(ship)?|nationality)\b/, pid: 27, why: "nationality -> country of citizenship (P27)" },
  { re: /\b(part of|belongs? to)\b/, pid: 361, why: "part of (P361)" },
  { re: /\b(made of|material)\b/, pid: 186, why: "made of -> made from material (P186)" },
  { re: /\b(color|colour)\b/, pid: 462, why: "colour (P462)" },
  { re: /\b(named after|named for)\b/, pid: 138, why: "named after (P138)" },
  { re: /\b(owned by|owner|owns)\b/, pid: 127, why: "owned by (P127)" },
  { re: /\b(headquarter(s|ed)?|based in)\b/, pid: 159, why: "headquarters location (P159)" },
];

/* "when" questions: the verb picks the date property */
export const WHEN_RELATIONS = [
  { re: /\b(born|birth)\b/, pid: 569, why: "born -> date of birth (P569)" },
  { re: /\b(died|death|die)\b/, pid: 570, why: "died -> date of death (P570)" },
  { re: /\b(founded|established|created|formed|inception|begin|began|start(ed)?)\b/, pid: 571, why: "founded -> inception (P571)" },
  { re: /\b(published|released|came out|premiere[d]?)\b/, pid: 577, why: "published -> publication date (P577)" },
  { re: /\b(end(ed)?|dissolved|abolished|closed)\b/, pid: 576, why: "ended -> dissolved/abolished (P576)" },
];

/* Wikidata property aliases that are English grammar, not relation names: "is a" is an alias of
 * `instance of`, "of" / "in" / "has" alias several properties. As relation phrases they would
 * swallow "what is a car" and "is X a Y". Declared here, skipped by the planner. */
export const GRAMMAR_ALIASES = new Set(["is a", "is an", "is", "are", "of", "in", "on", "at", "has", "have", "had", "be", "was", "were", "a", "an", "the", "to", "for", "with", "by", "from", "as", "type", "kind", "name", "named", "call", "called",
  "is in", "is at", "is on", "was in", "are in", "were in", "is from", "was from", "is of", "lies in", "sits in"]);

/* relations a question word can mean in more than one way; the executor tries them in order and
 * says which one answered. "language" of a country is its official language, of a person the
 * languages they speak, of a book the language of the work. */
export const ALT_HOPS = { 37: [1412, 407], 1412: [37, 407], 407: [37, 1412] };

/* a kind named by a relation: things that are the OBJECT of `country` facts are countries, of
 * `continent` facts continents, and so on. Used by the type check when the class hierarchy does
 * not settle it (in Wikidata5M "sovereign state" is not a subclass of "country"; being the country
 * of 47,396 things is the stronger evidence anyway). Declared, printed under hand-written. */
export const KIND_BY_RELATION = { country: 17, continent: 30, capital: 36, genre: 136, occupation: 106, language: 37, currency: 38,
                                  religion: 140, sport: 641, taxon: 171, publisher: 123, manufacturer: 176, developer: 178, author: 50,
                                  director: 57, composer: 86, performer: 175, spouse: 26, employer: 108, "record label": 264 };

/* relations that read the same in both directions, so an inbound edge may stand in for a missing
 * outbound one. Every other relation is walked FORWARD only: "X location Melbourne" backwards is
 * "Melbourne is the location of X", not "Melbourne's location" - v1's inverse-relation bug. */
export const SYMMETRIC = new Set([47, 26, 3373, 451, 460, 1327, 2652, 530, 1889]);

/* type nouns that introduce a name in apposition - "the film Inception", "the city Melbourne".
 * The noun is not part of the name; it becomes a context word that helps pick the reading. */
export const TYPE_WORDS = new Set(("film movie book novel play song album band city town village country river mountain lake island " +
  "company person actor actress writer author painter poet composer singer scientist philosopher king queen emperor president " +
  "planet star species animal plant language game series show").split(" "));

/* the location ladder for bare "where is X" */
export const WHERE_LADDER = [276, 131, 17, 30];   // location, admin territory, country, continent

/* "is X a Y" membership: instance of, subclass of, parent taxon */
export const ISA_RELS = [31, 279, 171];

/* counting grammar */
export const COUNT_RE = /^how many (?:(?:types|kinds|sorts|species|breeds|varieties) of )?(.+?)(?: are there| exist| exists?)?$/;
export const COUNT_FILTER_RE = /^(.+?) (?:that |which |who )?(?:have|has|are|is|with) (.+)$/;

/* the class-membership relations the count lane enumerates */
export const MEMBER_RELS = [279, 31, 171];

/* pronouns: the store holds facts about the world, not about the person asking or the system
 * answering, so a question whose only subject is a pronoun cannot be answered from it honestly */
export const PRONOUNS = new Set("i me my mine myself you your yours yourself we us our ours ourselves".split(" "));

/* ---- learning ---------------------------------------------------------------------------- */
/* sources that exist only at run time (the build's bits are 1..16, listed in index.json) */
export const SRC_LIVE = 32, SRC_READER = 64, SRC_DERIVED = 128;
export const LIVE_SOURCES = { 32: "wikidata.org (fetched live)", 64: "the reader (taught)", 128: "derived by rule" };
export const LIVE_FAMILIES = { 8: "the reader", 16: "derived" };

/* derivation rules: a missing TARGET relation is derived by walking VIA relations until a node
 * that carries the target. Each is a real inference over recorded facts, shown with its chain. */
export const DERIVE_RULES = [
  { target: 17, via: [131, 276, 361, 706], why: "country: walk located-in / location / part-of upward until a node with a country" },
  { target: 30, via: [17, 131, 276], why: "continent: walk to the country, then its continent" },
  { target: 131, via: [276, 361], why: "administrative territory: via location / part of" },
  { target: 1376, via: [], why: "(no rule - capital-of is not derivable from parts)" },
];

/* which question word an abstain turns into, by property */
export const ASK_WHO = new Set([50, 57, 112, 26, 40, 22, 25, 161, 175, 170, 61, 86, 98, 123, 127, 169, 488, 1037, 3373, 7, 9]);
export const ASK_WHEN = new Set([569, 570, 571, 577, 585, 580, 582, 576, 2031, 2032, 1191, 1619, 575]);
export const ASK_WHERE = new Set([17, 131, 276, 19, 20, 36, 1376, 30, 159, 740, 551, 937, 189, 1001]);
