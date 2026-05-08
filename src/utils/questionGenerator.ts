import type { Step, ZoneType } from '../types/game';

// Templates d'indices par zone (énigmes thématiques)
const INDICE_TEMPLATES: Record<ZoneType, string[]> = {
  salon: [
    "Le cœur de la maison où l'on se réunit, regarde sous ce qui te porte",
    "Cherche là où les invités s'assoient, entre les coussins",
    "Là où l'écran raconte des histoires, le code t'attend derrière",
    "Sous la table où les verres se posent",
    "Dans le meuble qui cache les livres oubliés",
  ],
  cuisine: [
    "Là où les secrets mijotent, ouvre ce qui garde le froid",
    "Dans le tiroir où dorment les ustensiles",
    "Près de ce qui réchauffe les plats en quelques secondes",
    "Sur l'étagère où les épices racontent leurs voyages",
    "Dans le placard le plus haut, là où on cache les trésors sucrés",
  ],
  chambre_garcon: [
    "Dans le repaire des garçons, sous ce qui les fait rêver la nuit",
    "Derrière le poster qui parle à leur passion",
    "Dans le tiroir secret, là où on cache ce qu'on ne montre pas",
    "Sous l'oreiller, là où se cachent les souvenirs",
    "Dans la poche du vêtement qui traîne",
  ],
  chambre_fille: [
    "Le sanctuaire des filles, devant ce qui reflète la vérité",
    "Dans la boîte à bijoux, là où brillent les secrets",
    "Sous l'oreiller parfumé",
    "Dans le tiroir de la coiffeuse, parmi les pinceaux",
    "Derrière les cadres qui gardent les souvenirs",
  ],
  douche: [
    "Là où l'eau coule à l'extérieur, regarde le robinet de près",
    "Dans le bac à savon, sous la mousse du temps",
    "Accroché là où on suspend les serviettes",
    "Au sol, là où les pieds se posent",
    "Derrière le miroir embué",
  ],
  etage2: [
    "Un niveau plus haut, la réponse est sur une porte",
    "Dans le couloir du 2ème, compte les pas",
    "Sur la fenêtre qui regarde dehors, au 2ème",
    "Dans l'interrupteur du 2ème étage",
    "Derrière le cadre accroché au mur du 2ème",
  ],
  etage3: [
    "Au sommet de la maison, sous la trappe du grenier",
    "Dans les combles, là où dorment les vieilles affaires",
    "Sur le toit, près de la cheminée",
    "Dans le coffre oublié au 3ème",
    "Au plus haut, là où personne ne monte",
  ],
  terrasse: [
    "Le terrain de jeu sous les étoiles, dans le pot qui fleurit",
    "Dans le coin où les plantes respirent",
    "Sur le mobilier de jardin, sous le coussin",
    "Près du barbecue endormi",
    "Dans la lanterne qui éclaire les soirées",
  ],
};

// Générateur de fragment aléatoire
const generateFragment = (index: number): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I et O pour éviter confusion
  const digit = Math.floor(Math.random() * 10);
  const letter = chars[Math.floor(Math.random() * chars.length)];
  return `${digit}${letter}${index + 1}`;
};

// Générateur de code 2 chiffres unique
const generateCode = (usedCodes: Set<string>): string => {
  let code: string;
  let attempts = 0;
  do {
    code = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    attempts++;
  } while (usedCodes.has(code) && attempts < 200);
  usedCodes.add(code);
  return code;
};

// Sélection aléatoire dans un tableau
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface GeneratorConfig {
  nbQuestions: number;      // Nombre total de questions à générer
  nbPieges: number;         // Nombre de pièges parmi les questions
  points: number;           // Points par question
  malus: number;            // Malus par piège
  useAllZones: boolean;     // Utiliser toutes les zones ou certaines
  zonesSelectionnees: ZoneType[]; // Zones à utiliser si useAllZones = false
  genererFragments: boolean; // Générer des fragments automatiquement
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  nbQuestions: 8,
  nbPieges: 1,
  points: 10,
  malus: 5,
  useAllZones: true,
  zonesSelectionnees: ['salon', 'cuisine', 'chambre_garcon', 'chambre_fille', 'douche', 'etage2', 'etage3', 'terrasse'],
  genererFragments: true,
};

export function generateQuestions(config: GeneratorConfig): (Step & { id: string })[] {
  const zones = config.useAllZones 
    ? Object.keys(INDICE_TEMPLATES) as ZoneType[]
    : config.zonesSelectionnees;
  
  const usedCodes = new Set<string>();
  const usedIndices = new Set<string>();
  const questions: (Step & { id: string })[] = [];
  
  // Déterminer positions des pièges
  const piegeIndexes = new Set<number>();
  while (piegeIndexes.size < Math.min(config.nbPieges, config.nbQuestions)) {
    piegeIndexes.add(Math.floor(Math.random() * config.nbQuestions));
  }
  
  for (let i = 0; i < config.nbQuestions; i++) {
    const zone = zones[i % zones.length];
    const templates = INDICE_TEMPLATES[zone];
    
    // Choisir un indice non utilisé si possible
    let indice = pickRandom(templates);
    let attempts = 0;
    while (usedIndices.has(indice) && attempts < 20) {
      indice = pickRandom(templates);
      attempts++;
    }
    usedIndices.add(indice);
    
    const isPiege = piegeIndexes.has(i);
    
    questions.push({
      id: `gen-${Date.now()}-${i}`,
      indice,
      code: generateCode(usedCodes),
      type: isPiege ? 'piege' : 'normal',
      points: config.points,
      malus: config.malus,
      zone,
      fragment: config.genererFragments ? generateFragment(i) : '',
    });
  }
  
  return questions;
}

export function generateTeamCode(existingCodes: Set<string>): string {
  let code: string;
  let attempts = 0;
  do {
    code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    attempts++;
  } while (existingCodes.has(code) && attempts < 1000);
  return code;
}

export function generateFinaleCode(fragments: string[]): { code: string; indice: string } {
  // Trier les fragments par le chiffre en premier
  const sorted = [...fragments].sort((a, b) => {
    const numA = parseInt(a[0]) || 0;
    const numB = parseInt(b[0]) || 0;
    return numA - numB;
  });
  return {
    code: sorted.join(''),
    indice: "Assemblez vos fragments du plus petit au plus grand chiffre",
  };
}
