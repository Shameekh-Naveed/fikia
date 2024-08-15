// user.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Language } from '../schemas/language.schema';

@Injectable()
export class LanguageSeeder {
  constructor(
    @InjectModel('Language') private languageModel: Model<Language>,
  ) {}

  async seed() {
    const existingCount = await this.languageModel.countDocuments();
    if (existingCount > 0)
      return console.log(
        'LanguageSeeder: Database already has entries. Skipping seeding',
      );
    const languagesToCreate = [
      { name: 'English' },
      { name: 'Spanish' },
      { name: 'French' },
      { name: 'German' },
      { name: 'Chinese (Mandarin)' },
      { name: 'Japanese' },
      { name: 'Korean' },
      { name: 'Italian' },
      { name: 'Portuguese' },
      { name: 'Russian' },
      { name: 'Arabic' },
      { name: 'Hindi' },
      { name: 'Bengali' },
      { name: 'Urdu' },
      { name: 'Punjabi' },
      { name: 'Turkish' },
      { name: 'Vietnamese' },
      { name: 'Thai' },
      { name: 'Dutch' },
      { name: 'Swedish' },
      { name: 'Danish' },
      { name: 'Norwegian' },
      { name: 'Finnish' },
      { name: 'Greek' },
      { name: 'Hebrew' },
      { name: 'Polish' },
      { name: 'Czech' },
      { name: 'Slovak' },
      { name: 'Hungarian' },
      { name: 'Romanian' },
      { name: 'Bulgarian' },
      { name: 'Serbian' },
      { name: 'Croatian' },
      { name: 'Bosnian' },
      { name: 'Slovenian' },
      { name: 'Macedonian' },
      { name: 'Albanian' },
      { name: 'Latvian' },
      { name: 'Lithuanian' },
      { name: 'Estonian' },
      { name: 'Maltese' },
      { name: 'Icelandic' },
      { name: 'Filipino' },
      { name: 'Malay' },
      { name: 'Indonesian' },
      { name: 'Swahili' },
      { name: 'Zulu' },
      { name: 'Xhosa' },
      { name: 'Afrikaans' },
      { name: 'Maori' },
    ];

    const languages = await this.languageModel.insertMany(languagesToCreate);
    console.log('LanguageSeeder: Database seeded successfully.');
  }
}
