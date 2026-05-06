import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { UserCollection } from './entities/collection.entity';
import { DataSource, Repository } from 'typeorm';
import { DEFAULT_COLLECTION } from './constants/default_collection';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { CardAlreadyExistException, CardNotForSaleException, CardNotFoundException, NotEnoughGoldException } from './exceptions/collection.exception';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { UserNotFoundException } from 'src/users/exceptions/users.exception';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { SKILLS } from 'src/artifact/constants/skills';

@Injectable()
export class CollectionService {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(UserCollection)
        private collectionRepository: Repository<UserCollection>,
        @InjectRepository(Card)
        private cardRepository: Repository<Card>,
        private usersService: UsersService
    ) {}

    async createForNewUser(userId: string): Promise<void> {
        for (const artifact of DEFAULT_COLLECTION) {
            const card = await this.cardRepository.findOne({ where: { innerCardId: artifact }})
            
            if (card == null) {
                continue;
            }

            const newCollectionRow = this.collectionRepository.create({
                userId: userId,
                cardId: card.id
            });

            await this.collectionRepository.save(newCollectionRow);
        }
    }

    async getUserCollection(userId: string): Promise<CollectionResponseDto> {
        await this.usersService.findOne(userId);

        const collectionCards = await this.collectionRepository.find({ where: { userId }});
        const allCards = await this.cardRepository.find();
        const response: CollectionResponseDto = {
            cards: []
        }

        for (const card of allCards) {
            if (!card.isForSale) {
                continue;
            }

            let skillCost: number | null = null;
            if (ARTIFACTS[card.innerCardId].skills && ARTIFACTS[card.innerCardId].skills!.length > 0) {
                const skill = ARTIFACTS[card.innerCardId].skills![0];
                skillCost = SKILLS[skill].cost;
            }

            response.cards.push({
                id: card.id,
                innerCardId: card.innerCardId,
                isForSale: card.isForSale,
                price: card.price,
                hasCard: collectionCards.find(c => c.cardId == card.id) ? true : false,
                maxHp: ARTIFACTS[card.innerCardId].hp,
                skillCost: skillCost,
                type: ARTIFACTS[card.innerCardId].type
            })
        }

        return response;
    }

    async buyCard(userId: string, cardId: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const user = await queryRunner.manager
                .createQueryBuilder(User, 'user')
                .setLock('pessimistic_write')
                .where('user.id = :userId', { userId })
                .getOne();
                
            const card = await queryRunner.manager
                .createQueryBuilder(Card, 'card')
                .setLock('pessimistic_write')
                .where('card.id = :cardId', { cardId })
                .getOne();
             
            if (!user) {
                throw new UserNotFoundException();
            }

            if (!card) {
                throw new CardNotFoundException();
            }

            const existingCollection = await queryRunner.manager.findOne(UserCollection, {
                where: { userId, cardId }
            });
            
            if (existingCollection) {
                throw new CardAlreadyExistException();
            }

            if (user.gold < card.price) {
                throw new NotEnoughGoldException();
            }

            if (!card.isForSale) {
                throw new CardNotForSaleException();
            }

            const newCollectionRow = queryRunner.manager.create(UserCollection, {
                userId: userId,
                cardId: card.id
            });
            await queryRunner.manager.save(newCollectionRow);

            user.gold -= card.price;
            await queryRunner.manager.save(User, user);
            
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async giveGold(userId: string, amount: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const user = await queryRunner.manager
                .createQueryBuilder(User, 'user')
                .setLock('pessimistic_write')
                .where('user.id = :userId', { userId })
                .getOne();
                
            if (!user) {
                throw new UserNotFoundException();
            }

            user.gold += amount;
            await queryRunner.manager.save(User, user);
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
