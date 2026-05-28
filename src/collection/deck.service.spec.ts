import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeckService } from './deck.service';
import { UsersService } from '../users/users.service';
import { Card } from './entities/card.entity';
import { Deck } from './entities/deck.entity';
import { DeckCard } from './entities/deck-card.entity';
import {
    DeckNotFoundException,
    InvalidNewDeckException,
} from './exceptions/deck.exception';
import { CardNotFoundException } from './exceptions/collection.exception';
import { UserNotFoundException } from '../users/exceptions/users.exception';
import { ChangeActiveDeckDto } from './dto/change-active-deck.dto';
import { ChangeDeckCardsDto, CardPosition } from './dto/change-deck-cards.dto';
import { MAX_COUNT_DECK_CARDS } from './constants/settings';
import { ROBOT_DECK } from './constants/bot_deck';
import { ARTIFACTS } from '../artifact/constants/artifacts';
import { SKILLS } from '../artifact/constants/skills';
import { User } from 'src/users/entities/user.entity';

jest.mock('../artifact/constants/artifacts');
jest.mock('../artifact/constants/skills');

const mockArtifacts: Record<string, any> = {
    arcane_shield: {
        id: 'arcane_shield',
        hp: 30,
        type: 'defense',
        skills: ['shield'],
        price: 100,
        isForSale: true,
    },
    moon_staff: {
        id: 'moon_staff',
        hp: 25,
        type: 'magic',
        skills: ['heal'],
        price: 150,
        isForSale: true,
    },
    axe_of_the_berserker: {
        id: 'axe_of_the_berserker',
        hp: 40,
        type: 'attack',
        skills: ['rage'],
        price: 200,
        isForSale: true,
    },
    ring_of_light: {
        id: 'ring_of_light',
        hp: 20,
        type: 'support',
        skills: null,
        price: 80,
        isForSale: true,
    },
    bonelord: {
        id: 'bonelord',
        hp: 35,
        type: 'attack',
        skills: null,
        price: 180,
        isForSale: true,
    },
    huntmaster: {
        id: 'huntmaster',
        hp: 38,
        type: 'attack',
        skills: ['hunt'],
        price: 190,
        isForSale: true,
    },
    grappler: {
        id: 'grappler',
        hp: 36,
        type: 'attack',
        skills: ['grab'],
        price: 155,
        isForSale: true,
    },
    illusion_blade: {
        id: 'illusion_blade',
        hp: 32,
        type: 'attack',
        skills: ['illusion'],
        price: 160,
        isForSale: true,
    },
    purifier: {
        id: 'purifier',
        hp: 35,
        type: 'magic',
        skills: ['purify'],
        price: 170,
        isForSale: true,
    },
    veilstrike: {
        id: 'veilstrike',
        hp: 30,
        type: 'attack',
        skills: ['veil'],
        price: 140,
        isForSale: true,
    },
    paladins_glove: {
        id: 'paladins_glove',
        hp: 28,
        type: 'support',
        skills: ['bless'],
        price: 110,
        isForSale: true,
    },
    averter: {
        id: 'averter',
        hp: 33,
        type: 'defense',
        skills: ['block'],
        price: 130,
        isForSale: true,
    },
    volt: {
        id: 'volt',
        hp: 27,
        type: 'magic',
        skills: ['shock'],
        price: 105,
        isForSale: true,
    },
    voider: {
        id: 'voider',
        hp: 27,
        type: 'magic',
        skills: ['void'],
        price: 105,
        isForSale: true,
    },
    glimpse: {
        id: 'glimpse',
        hp: 22,
        type: 'magic',
        skills: ['foresight'],
        price: 90,
        isForSale: true,
    },
    temper_crown: {
        id: 'temper_crown',
        hp: 28,
        type: 'support',
        skills: ['buff'],
        price: 120,
        isForSale: true,
    },
    chronos: {
        id: 'chronos',
        hp: 35,
        type: 'magic',
        skills: ['time'],
        price: 200,
        isForSale: true,
    },
    ring_of_destruction: {
        id: 'ring_of_destruction',
        hp: 30,
        type: 'attack',
        skills: ['destroy'],
        price: 125,
        isForSale: true,
    },
    concealer: {
        id: 'concealer',
        hp: 26,
        type: 'magic',
        skills: ['conceal'],
        price: 95,
        isForSale: true,
    },
    plunder: {
        id: 'plunder',
        hp: 34,
        type: 'attack',
        skills: ['steal'],
        price: 145,
        isForSale: true,
    },
    swift_boots: {
        id: 'swift_boots',
        hp: 24,
        type: 'support',
        skills: ['haste'],
        price: 85,
        isForSale: true,
    },
    divine_staff: {
        id: 'divine_staff',
        hp: 30,
        type: 'magic',
        skills: ['heal'],
        price: 175,
        isForSale: true,
    },
};

const mockSkills = {
    shield: { cost: 2 },
    heal: { cost: 3 },
    rage: { cost: 1 },
    hunt: { cost: 2 },
    grab: { cost: 2 },
    illusion: { cost: 2 },
    purify: { cost: 2 },
    veil: { cost: 1 },
    bless: { cost: 2 },
    block: { cost: 2 },
    shock: { cost: 2 },
    void: { cost: 2 },
    foresight: { cost: 1 },
    buff: { cost: 2 },
    time: { cost: 3 },
    destroy: { cost: 2 },
    conceal: { cost: 1 },
    steal: { cost: 2 },
    haste: { cost: 2 },
};

describe('DeckService', () => {
    let service: DeckService;
    let deckRepository: jest.Mocked<Repository<Deck>>;
    let deckCardRepository: jest.Mocked<Repository<DeckCard>>;
    let cardRepository: jest.Mocked<Repository<Card>>;
    let usersService: jest.Mocked<UsersService>;

    const mockDeckRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockDeckCardRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
    };

    const mockCardRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockUsersService = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        (ARTIFACTS as any) = mockArtifacts;
        (SKILLS as any) = mockSkills;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeckService,
                {
                    provide: getRepositoryToken(Deck),
                    useValue: mockDeckRepository,
                },
                {
                    provide: getRepositoryToken(DeckCard),
                    useValue: mockDeckCardRepository,
                },
                {
                    provide: getRepositoryToken(Card),
                    useValue: mockCardRepository,
                },
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        service = module.get<DeckService>(DeckService);
        deckRepository = module.get(getRepositoryToken(Deck));
        deckCardRepository = module.get(getRepositoryToken(DeckCard));
        cardRepository = module.get(getRepositoryToken(Card));
        usersService = module.get(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createForNewUser', () => {
        const userId = 'user-123';

        it('should create 3 decks with default cards for new user', async () => {
            const mockDeck1 = { id: 1, userId, isActive: true, indexNumber: 1 };
            const mockDeck2 = {
                id: 2,
                userId,
                isActive: false,
                indexNumber: 2,
            };
            const mockDeck3 = {
                id: 3,
                userId,
                isActive: false,
                indexNumber: 3,
            };

            mockDeckRepository.create
                .mockReturnValueOnce(mockDeck1 as Deck)
                .mockReturnValueOnce(mockDeck2 as Deck)
                .mockReturnValueOnce(mockDeck3 as Deck);

            mockDeckRepository.save
                .mockResolvedValueOnce(mockDeck1 as Deck)
                .mockResolvedValueOnce(mockDeck2 as Deck)
                .mockResolvedValueOnce(mockDeck3 as Deck);

            mockCardRepository.findOne.mockImplementation(
                ({ where: { innerCardId } }: any) => {
                    return Promise.resolve({ id: 1, innerCardId } as Card);
                },
            );

            mockDeckCardRepository.create.mockReturnValue({} as DeckCard);
            mockDeckCardRepository.save.mockResolvedValue({} as DeckCard);

            await service.createForNewUser(userId);

            expect(mockDeckRepository.create).toHaveBeenCalledTimes(3);
            expect(mockDeckRepository.save).toHaveBeenCalledTimes(3);
            expect(mockCardRepository.findOne).toHaveBeenCalled();
            expect(mockDeckCardRepository.create).toHaveBeenCalled();
            expect(mockDeckCardRepository.save).toHaveBeenCalled();
        });

        it('should skip cards not found in database', async () => {
            const mockDeck = { id: 1, userId, isActive: true, indexNumber: 1 };

            mockDeckRepository.create.mockReturnValue(mockDeck as Deck);
            mockDeckRepository.save.mockResolvedValue(mockDeck as Deck);
            mockCardRepository.findOne.mockResolvedValue(null);

            await service.createForNewUser(userId);

            expect(mockDeckCardRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('getUserDecks', () => {
        const userId = 'user-123';

        it('should return user decks with cards', async () => {
            const mockUser = { id: userId, nickname: 'TestUser' };
            const mockDecks = [
                { id: 1, userId, indexNumber: 1, isActive: true },
                { id: 2, userId, indexNumber: 2, isActive: false },
            ];
            const mockAllCards = [
                {
                    id: 10,
                    innerCardId: 'arcane_shield',
                    isForSale: true,
                    price: 100,
                },
                {
                    id: 11,
                    innerCardId: 'moon_staff',
                    isForSale: true,
                    price: 150,
                },
            ];
            const mockDeckCards = [
                { deckId: 1, cardId: 10, position: 1 },
                { deckId: 1, cardId: 11, position: 2 },
                { deckId: 2, cardId: 10, position: 1 },
            ];

            mockUsersService.findOne.mockResolvedValue(mockUser as User);
            mockDeckRepository.find.mockResolvedValue(mockDecks as Deck[]);
            mockCardRepository.find.mockResolvedValue(mockAllCards as Card[]);
            mockDeckCardRepository.find
                .mockResolvedValueOnce([
                    mockDeckCards[0],
                    mockDeckCards[1],
                ] as DeckCard[])
                .mockResolvedValueOnce([mockDeckCards[2]] as DeckCard[]);

            const result = await service.getUserDecks(userId);

            expect(usersService.findOne).toHaveBeenCalledWith(userId);
            expect(result.decks).toHaveLength(2);
            expect(result.decks[0].cards).toHaveLength(2);
            expect(result.decks[0].isActive).toBe(true);
            expect(result.decks[1].isActive).toBe(false);
        });

        it('should throw UserNotFoundException if user not found', async () => {
            mockUsersService.findOne.mockRejectedValue(
                new UserNotFoundException(),
            );

            await expect(service.getUserDecks(userId)).rejects.toThrow(
                UserNotFoundException,
            );
        });

        it('should throw CardNotFoundException if card entity not found', async () => {
            const mockUser = { id: userId, nickname: 'TestUser' };
            const mockDecks = [
                { id: 1, userId, indexNumber: 1, isActive: true },
            ];
            const mockAllCards = [
                {
                    id: 10,
                    innerCardId: 'arcane_shield',
                    isForSale: true,
                    price: 100,
                },
            ];
            const mockDeckCards = [{ deckId: 1, cardId: 99, position: 1 }];

            mockUsersService.findOne.mockResolvedValue(mockUser as User);
            mockDeckRepository.find.mockResolvedValue(mockDecks as Deck[]);
            mockCardRepository.find.mockResolvedValue(mockAllCards as Card[]);
            mockDeckCardRepository.find.mockResolvedValue(
                mockDeckCards as DeckCard[],
            );

            await expect(service.getUserDecks(userId)).rejects.toThrow(
                CardNotFoundException,
            );
        });
    });

    describe('getBotGameDeck', () => {
        it('should return bot deck with artifacts', async () => {
            const result = await service.getBotGameDeck();

            expect(result).toHaveLength(ROBOT_DECK.length);
            expect(result[0]).toHaveProperty('artifactId');
            expect(result[0]).toHaveProperty('maxHp');
            expect(result[0]).toHaveProperty('skillCost');

            for (const deckCard of ROBOT_DECK) {
                expect(mockArtifacts[deckCard]).toBeDefined();
            }
        });
    });

    describe('changeActiveDeck', () => {
        const userId = 'user-123';
        const changeActiveDeckDto: ChangeActiveDeckDto = { deckId: 2 };

        it('should change active deck successfully', async () => {
            const mockDecks = [
                { id: 1, userId, isActive: true, indexNumber: 1 },
                { id: 2, userId, isActive: false, indexNumber: 2 },
            ];

            mockDeckRepository.find.mockResolvedValue(mockDecks as Deck[]);
            mockDeckRepository.save.mockResolvedValue({} as Deck);

            await service.changeActiveDeck(userId, changeActiveDeckDto);

            expect(mockDecks[0].isActive).toBe(false);
            expect(mockDecks[1].isActive).toBe(true);
            expect(mockDeckRepository.save).toHaveBeenCalledTimes(2);
        });

        it('should throw DeckNotFoundException if new active deck not found', async () => {
            const mockDecks = [
                { id: 1, userId, isActive: true, indexNumber: 1 },
            ];

            mockDeckRepository.find.mockResolvedValue(mockDecks as Deck[]);

            await expect(
                service.changeActiveDeck(userId, changeActiveDeckDto),
            ).rejects.toThrow(DeckNotFoundException);
            expect(mockDeckRepository.save).not.toHaveBeenCalled();
        });

        it('should throw DeckNotFoundException if current active deck not found', async () => {
            const mockDecks = [
                { id: 2, userId, isActive: false, indexNumber: 2 },
            ];

            mockDeckRepository.find.mockResolvedValue(mockDecks as Deck[]);

            await expect(
                service.changeActiveDeck(userId, changeActiveDeckDto),
            ).rejects.toThrow(DeckNotFoundException);
            expect(mockDeckRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('changeDeckCards', () => {
        const userId = 'user-123';
        const deckId = 1;

        const createValidCards = (): CardPosition[] => {
            const cards: CardPosition[] = [];
            for (let i = 1; i <= MAX_COUNT_DECK_CARDS; i++) {
                cards.push({ cardId: i, position: i });
            }
            return cards;
        };

        const changeDeckCardsDto: ChangeDeckCardsDto = {
            deckId,
            cards: createValidCards(),
        };

        it('should change deck cards successfully', async () => {
            const mockAllCards: Card[] = [];
            for (let i = 1; i <= MAX_COUNT_DECK_CARDS; i++) {
                mockAllCards.push({ id: i, innerCardId: `card_${i}` } as Card);
            }
            mockCardRepository.find.mockResolvedValue(mockAllCards);

            const mockDecks: Deck[] = [{ id: deckId, userId } as Deck];
            const mockDeckCards: DeckCard[] = [];
            for (let i = 1; i <= MAX_COUNT_DECK_CARDS; i++) {
                mockDeckCards.push({
                    id: i,
                    deckId,
                    cardId: i,
                    position: i,
                } as DeckCard);
            }

            mockDeckRepository.find.mockResolvedValue(mockDecks);
            mockDeckCardRepository.find.mockResolvedValue(mockDeckCards);
            mockDeckCardRepository.save.mockResolvedValue({} as DeckCard);

            await service.changeDeckCards(userId, changeDeckCardsDto);

            expect(mockDeckCardRepository.save).toHaveBeenCalledTimes(
                MAX_COUNT_DECK_CARDS,
            );
        });

        it('should throw InvalidNewDeckException if cards length is incorrect', async () => {
            const invalidDto = {
                ...changeDeckCardsDto,
                cards: [{ cardId: 1, position: 1 }],
            };

            await expect(
                service.changeDeckCards(userId, invalidDto),
            ).rejects.toThrow(InvalidNewDeckException);
            expect(mockDeckCardRepository.save).not.toHaveBeenCalled();
        });

        it('should throw InvalidNewDeckException if cards have duplicate cardIds', async () => {
            const cards = createValidCards();
            cards[0].cardId = cards[1].cardId;
            const invalidDto = { ...changeDeckCardsDto, cards };

            await expect(
                service.changeDeckCards(userId, invalidDto),
            ).rejects.toThrow(InvalidNewDeckException);
        });

        it('should throw InvalidNewDeckException if card not found in database', async () => {
            const mockAllCards: Card[] = [];
            for (let i = 1; i <= MAX_COUNT_DECK_CARDS; i++) {
                mockAllCards.push({ id: i, innerCardId: `card_${i}` } as Card);
            }
            mockCardRepository.find.mockResolvedValue(mockAllCards);

            const cards = createValidCards();
            cards[0].cardId = 999;
            const invalidDto = { ...changeDeckCardsDto, cards };

            await expect(
                service.changeDeckCards(userId, invalidDto),
            ).rejects.toThrow(InvalidNewDeckException);
        });

        it('should throw InvalidNewDeckException if positions are missing', async () => {
            const mockAllCards: Card[] = [];
            for (let i = 1; i <= MAX_COUNT_DECK_CARDS; i++) {
                mockAllCards.push({ id: i, innerCardId: `card_${i}` } as Card);
            }
            mockCardRepository.find.mockResolvedValue(mockAllCards);

            const cards = createValidCards();
            cards[0].position = MAX_COUNT_DECK_CARDS + 1;
            const invalidDto = { ...changeDeckCardsDto, cards };

            await expect(
                service.changeDeckCards(userId, invalidDto),
            ).rejects.toThrow(InvalidNewDeckException);
        });

        it('should throw DeckNotFoundException if deck not found', async () => {
            const mockAllCards: Card[] = [];
            for (let i = 1; i <= MAX_COUNT_DECK_CARDS; i++) {
                mockAllCards.push({ id: i, innerCardId: `card_${i}` } as Card);
            }
            mockCardRepository.find.mockResolvedValue(mockAllCards);
            mockDeckRepository.find.mockResolvedValue([]);

            await expect(
                service.changeDeckCards(userId, changeDeckCardsDto),
            ).rejects.toThrow(DeckNotFoundException);
            expect(mockDeckCardRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('createDefaultDeckCards', () => {
        const mockDeck = { id: 1, userId: 'user-123' } as Deck;

        it('should create deck cards from default deck array', async () => {
            const defaultDeck = ['arcane_shield', 'moon_staff'];

            mockCardRepository.findOne.mockImplementation(
                ({ where: { innerCardId } }: any) => {
                    return Promise.resolve({ id: 1, innerCardId } as Card);
                },
            );
            mockDeckCardRepository.create.mockReturnValue({} as DeckCard);
            mockDeckCardRepository.save.mockResolvedValue({} as DeckCard);

            await service.createDefaultDeckCards(mockDeck, defaultDeck);

            expect(mockCardRepository.findOne).toHaveBeenCalledTimes(2);
            expect(mockDeckCardRepository.create).toHaveBeenCalledTimes(2);
            expect(mockDeckCardRepository.save).toHaveBeenCalledTimes(2);
        });

        it('should skip cards not found', async () => {
            const defaultDeck = ['arcane_shield', 'non_existent_card'];

            mockCardRepository.findOne
                .mockResolvedValueOnce({
                    id: 1,
                    innerCardId: 'arcane_shield',
                } as Card)
                .mockResolvedValueOnce(null);

            await service.createDefaultDeckCards(mockDeck, defaultDeck);

            expect(mockDeckCardRepository.create).toHaveBeenCalledTimes(1);
            expect(mockDeckCardRepository.save).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge cases', () => {
        const userId = 'user-123';

        it('should handle empty decks array for user', async () => {
            const mockUser = { id: userId, nickname: 'TestUser' };

            mockUsersService.findOne.mockResolvedValue(mockUser as User);
            mockDeckRepository.find.mockResolvedValue([]);
            mockCardRepository.find.mockResolvedValue([]);

            const result = await service.getUserDecks(userId);

            expect(result.decks).toEqual([]);
        });

        it('should handle empty deck cards for a deck', async () => {
            const mockUser = { id: userId, nickname: 'TestUser' };
            const mockDecks = [
                { id: 1, userId, indexNumber: 1, isActive: true },
            ];

            mockUsersService.findOne.mockResolvedValue(mockUser as User);
            mockDeckRepository.find.mockResolvedValue(mockDecks as Deck[]);
            mockCardRepository.find.mockResolvedValue([]);
            mockDeckCardRepository.find.mockResolvedValue([]);

            const result = await service.getUserDecks(userId);

            expect(result.decks[0].cards).toEqual([]);
        });
    });
});
