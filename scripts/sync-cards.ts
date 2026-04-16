import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as readline from 'readline';
import { CardsService } from 'src/collection/cards.service';

async function askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

async function bootstrap() {
    console.log('🃏 Card Synchronization Script');
    console.log('===============================');
    
    // Проверка окружения
    if (process.env.NODE_ENV === 'production') {
        console.log('⚠️  WARNING: You are running this in PRODUCTION mode!');
        const confirmed = await askConfirmation('Are you sure you want to sync cards? (yes/no): ');
        
        if (!confirmed) {
            console.log('❌ Synchronization cancelled.');
            process.exit(0);
        }
        
        const backupConfirmed = await askConfirmation('Have you backed up the database? (yes/no): ');
        if (!backupConfirmed) {
            console.log('❌ Please backup database first!');
            process.exit(0);
        }
    }
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const cardsService = app.get(CardsService);
    
    try {
        console.log('🔄 Syncing cards from definitions...');
        await cardsService.syncCardsFromDefinitions();
        console.log('✅ Cards synchronized successfully!');
    } catch (error) {
        console.error('❌ Synchronization failed:', error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();