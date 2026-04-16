import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Card } from './entities/card.entity';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { ArtifactDataType } from 'src/artifact/types/artifact';

@Injectable()
export class CardsService implements OnModuleInit {
    private readonly logger = new Logger(CardsService.name);

    constructor(
        @InjectRepository(Card)
        private cardRepository: Repository<Card>,
    ) {}
    
    async onModuleInit() {
        if (process.env.NODE_ENV !== 'production') {
            await this.syncCardsFromDefinitions();
        }
    }

    async syncCardsFromDefinitions(): Promise<void> {
        this.logger.log('Starting cards synchronization...');
        
        let synced = 0;
        let added = 0;
        let updated = 0;

        for (const cardData of Object.values(ARTIFACTS)) {
            const existingCard = await this.cardRepository.findOne({
                where: { innerCardId: cardData.id }
            });

            if (!existingCard) {
                await this.cardRepository.save(this.mapDefinitionToEntity(cardData));
                added++;
                this.logger.debug(`Added new card: ${cardData.id}`);
            } else {
                const needsUpdate = this.checkIfNeedsUpdate(existingCard, cardData);
                
                if (needsUpdate) {
                    await this.cardRepository.update(
                        { id: existingCard.id },
                        this.mapDefinitionToEntity(cardData)
                    );
                    updated++;
                    this.logger.debug(`Updated card: ${cardData.id}`);
                } else {
                    synced++;
                }
            }
        }

        this.logger.log(`✅ Sync complete: ${added} added, ${updated} updated, ${synced} synced`);
        
        await this.removeOrphanedCards();
    }

    // Проверка, нужно ли обновлять карту
    private checkIfNeedsUpdate(existingCard: Card, definition: ArtifactDataType): boolean {
        return existingCard.price !== definition.price ||
               existingCard.isForSale !== definition.isForSale
    }

    // Преобразование определения в entity
    private mapDefinitionToEntity(definition: ArtifactDataType): Partial<Card> {
        return {
            innerCardId: definition.id,
            isForSale: definition.isForSale,
            price: definition.price
        };
    }

    // Удаление карт, которых больше нет в определениях
    private async removeOrphanedCards(): Promise<void> {
        const definedIds = Object.values(ARTIFACTS).map(card => card.id);

        const allCards = await this.cardRepository.find();
        const orphaned = allCards.filter(card => 
            !definedIds.includes(card.innerCardId)
        );
        
        if (orphaned.length > 0) {
            await this.cardRepository.remove(orphaned);
            this.logger.warn(`Removed ${orphaned.length} orphaned cards`);
        }
    }
}