import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { AliasGeneratorService } from '../../application/services/alias-generator.service';

/**
 * Implementación del servicio de generación de alias usando Faker.js
 * Genera nombres de animales únicos y amigables como alias para visitantes
 */
@Injectable()
export class FakerAliasGeneratorAdapter implements AliasGeneratorService {
  /**
   * Genera un alias aleatorio usando Faker.js
   * Combina un adjetivo con un nombre de animal para crear alias amigables
   * @returns Un string con el alias generado (ej: "Brave Lion", "Clever Fox")
   */
  generate(): string {
    const adjective = faker.word.adjective();
    // Usar uno de los métodos disponibles de animal de forma aleatoria
    const animalTypes = [
      'dog',
      'cat',
      'bear',
      'lion',
      'horse',
      'bird',
      'fish',
      'rabbit',
    ] as const;
    const randomIndex = Math.floor(Math.random() * animalTypes.length);
    const animalType = animalTypes[randomIndex];

    let animal: string;
    switch (animalType) {
      case 'dog':
        animal = faker.animal.dog();
        break;
      case 'cat':
        animal = faker.animal.cat();
        break;
      case 'bear':
        animal = faker.animal.bear();
        break;
      case 'lion':
        animal = faker.animal.lion();
        break;
      case 'horse':
        animal = faker.animal.horse();
        break;
      case 'bird':
        animal = faker.animal.bird();
        break;
      case 'fish':
        animal = faker.animal.fish();
        break;
      case 'rabbit':
        animal = faker.animal.rabbit();
        break;
      default:
        animal = faker.animal.dog(); // fallback
    }

    // Filtrar caracteres no alfabéticos del adjetivo, manteniendo solo letras
    const cleanAdjective = adjective.replace(/[^a-zA-Z]/g, '');

    // Si el animal tiene múltiples palabras, usar solo la última y limpiar caracteres no alfabéticos
    const animalWords = animal.split(' ');
    const lastAnimalWord = animalWords[animalWords.length - 1];
    const cleanAnimal = lastAnimalWord.replace(/[^a-zA-Z]/g, '');

    // Capitalizar la primera letra de cada palabra
    const capitalizedAdjective =
      cleanAdjective.charAt(0).toUpperCase() +
      cleanAdjective.slice(1).toLowerCase();
    const capitalizedAnimal =
      cleanAnimal.charAt(0).toUpperCase() + cleanAnimal.slice(1).toLowerCase();

    return `${capitalizedAdjective} ${capitalizedAnimal}`;
  }
}
