import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { UserCollection } from './entities/collection.entity';
import { DataSource, Repository } from 'typeorm';
import { DEFAULT_COLLECTION } from './constants/default_collection';
import { CollectionResponseDto } from './dto/collection-response.dto';
import {
    CardAlreadyExistException,
    CardNotForSaleException,
    CardNotFoundException,
    NotEnoughGoldException,
} from './exceptions/collection.exception';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { UserNotFoundException } from 'src/users/exceptions/users.exception';
import { ARTIFACTS } from 'src/artifact/constants/artifacts';
import { SKILLS } from 'src/artifact/constants/skills';
import { Deck } from './entities/deck.entity';
import { DeckCard } from './entities/deck-card.entity';
import {
    DEFAULT_DECK1,
    DEFAULT_DECK2,
    DEFAULT_DECK3,
} from './constants/default_decks';
import { GetDecksResponseDto } from './dto/get-decks-response.dto';
import { DeckResponseDto } from './dto/deck-response.dto';
import {
    DeckNotFoundException,
    InvalidNewDeckException,
} from './exceptions/deck.exception';
import { ChangeActiveDeckDto } from './dto/change-active-deck.dto';
import { ChangeDeckCardsDto } from './dto/change-deck-cards.dto';
import { MAX_COUNT_DECK_CARDS } from './constants/settings';
import { CardResponseDto } from './dto/card-response.dto';
import { ROBOT_DECK } from './constants/bot_deck';
import { DeckArtifact } from 'src/game-state/types/game';

@Injectable()
export class DeckService {
    constructor(
        @InjectRepository(Deck)
        private deckRepository: Repository<Deck>,
        @InjectRepository(DeckCard)
        private deckCardRepository: Repository<DeckCard>,
        @InjectRepository(Card)
        private cardRepository: Repository<Card>,
        private usersService: UsersService,
    ) {}

    async createForNewUser(userId: string): Promise<void> {
        let deck1 = this.deckRepository.create({
            userId: userId,
            isActive: true,
            indexNumber: 1,
        });

        deck1 = await this.deckRepository.save(deck1);
        await this.createDefaultDeckCards(deck1, DEFAULT_DECK1);

        let deck2 = this.deckRepository.create({
            userId: userId,
            isActive: false,
            indexNumber: 2,
        });

        deck2 = await this.deckRepository.save(deck2);
        await this.createDefaultDeckCards(deck2, DEFAULT_DECK2);

        let deck3 = this.deckRepository.create({
            userId: userId,
            isActive: false,
            indexNumber: 3,
        });

        deck3 = await this.deckRepository.save(deck3);
        await this.createDefaultDeckCards(deck3, DEFAULT_DECK3);
    }

    async createDefaultDeckCards(deck: Deck, default_deck: string[]) {
        let count = 1;
        for (const artifact of default_deck) {
            const card = await this.cardRepository.findOne({
                where: { innerCardId: artifact },
            });

            if (card == null) {
                continue;
            }

            const deckCard = await this.deckCardRepository.create({
                deckId: deck.id,
                cardId: card.id,
                position: count,
            });

            await this.deckCardRepository.save(deckCard);

            count += 1;
        }
    }

    async getUserDecks(userId: string): Promise<GetDecksResponseDto> {
        await this.usersService.findOne(userId);

        const decks = await this.deckRepository.find({ where: { userId } });
        const allCards = await this.cardRepository.find();
        const response: GetDecksResponseDto = {
            decks: [],
        };

        for (const deck of decks) {
            const deckDto: DeckResponseDto = {
                id: deck.id,
                indexNumber: deck.indexNumber,
                isActive: deck.isActive,
                cards: [],
            };

            const deckCards = await this.deckCardRepository.find({
                where: { deckId: deck.id },
            });

            for (const deckCard of deckCards) {
                const cardEntity = allCards.find(
                    (c) => c.id === deckCard.cardId,
                );

                if (!cardEntity) {
                    throw new CardNotFoundException();
                }

                let skillCost: number | null = null;
                if (
                    ARTIFACTS[cardEntity.innerCardId].skills &&
                    ARTIFACTS[cardEntity.innerCardId].skills!.length > 0
                ) {
                    const skill = ARTIFACTS[cardEntity.innerCardId].skills![0];
                    skillCost = SKILLS[skill].cost;
                }

                deckDto.cards.push({
                    id: cardEntity.id,
                    innerCardId: cardEntity.innerCardId,
                    isForSale: cardEntity.isForSale,
                    price: cardEntity.price,
                    hasCard: true,
                    maxHp: ARTIFACTS[cardEntity.innerCardId].hp,
                    skillCost: skillCost,
                    type: ARTIFACTS[cardEntity.innerCardId].type,
                    position: deckCard.position,
                });
            }

            response.decks.push(deckDto);
        }

        return response;
    }

    async getBotGameDeck(): Promise<DeckArtifact[]> {
        const finalDeck: DeckArtifact[] = [];

        for (const deckCard of ROBOT_DECK) {
            finalDeck.push({
                artifactId: ARTIFACTS[deckCard].id,
                maxHp: ARTIFACTS[deckCard].hp,
                skillCost:
                    ARTIFACTS[deckCard].skills === null
                        ? 0
                        : SKILLS[ARTIFACTS[deckCard].skills[0]].cost,
            });
        }

        return finalDeck;
    }

    async changeActiveDeck(
        userId: string,
        data: ChangeActiveDeckDto,
    ): Promise<void> {
        const decks = await this.deckRepository.find({ where: { userId } });
        const newActiveDeck = decks.find((deck) => deck.id === data.deckId);

        if (!newActiveDeck) {
            throw new DeckNotFoundException();
        }

        const currentActiveDeck = decks.find((deck) => deck.isActive);

        if (!currentActiveDeck) {
            throw new DeckNotFoundException();
        }

        currentActiveDeck.isActive = false;
        newActiveDeck.isActive = true;
        await this.deckRepository.save(currentActiveDeck);
        await this.deckRepository.save(newActiveDeck);
    }

    async changeDeckCards(
        userId: string,
        data: ChangeDeckCardsDto,
    ): Promise<void> {
        if (data.cards.length !== MAX_COUNT_DECK_CARDS) {
            throw new InvalidNewDeckException();
        }

        const allCards = await this.cardRepository.find();

        const setFromArray = new Set(
            data.cards.map((card) => {
                return card.cardId;
            }),
        );
        if (setFromArray.size !== MAX_COUNT_DECK_CARDS) {
            throw new InvalidNewDeckException();
        }

        for (let i = 1; i <= MAX_COUNT_DECK_CARDS; i++) {
            if (
                !allCards.find((card) => card.id === data.cards[i - 1].cardId)
            ) {
                throw new InvalidNewDeckException();
            }

            if (!data.cards.find((card) => card.position === i)) {
                throw new InvalidNewDeckException();
            }
        }

        const decks = await this.deckRepository.find({ where: { userId } });
        const currentDeck = decks.find((deck) => deck.id === data.deckId);

        if (!currentDeck) {
            throw new DeckNotFoundException();
        }

        const deckCards = await this.deckCardRepository.find({
            where: { deckId: currentDeck.id },
        });

        for (const card of data.cards) {
            const cardEntity = allCards.find((c) => c.id === card.cardId)!;
            const deckCard = deckCards.find(
                (d) => d.position === card.position,
            )!;
            deckCard.cardId = cardEntity.id;

            await this.deckCardRepository.save(deckCard);
        }
    }
}
