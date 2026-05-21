import { Test, TestingModule } from '@nestjs/testing';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import { GetDecksResponseDto } from './dto/get-decks-response.dto';
import { ChangeDeckCardsDto, CardPosition } from './dto/change-deck-cards.dto';
import { ChangeActiveDeckDto } from './dto/change-active-deck.dto';
import { DeckResponseDto } from './dto/deck-response.dto';
import { CardResponseDto } from './dto/card-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const createMockRequest = (userId: string = 'user-123'): any => ({
    user: { userId },
    headers: {},
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
});


const createMockCardResponse = (
    id: number,
    innerCardId: string,
    position: number,
    hasCard: boolean = true
): CardResponseDto => ({
    id,
    innerCardId,
    price: 100,
    isForSale: true,
    hasCard,
    maxHp: 30,
    skillCost: 2,
    type: 'attack',
    position,
});


const createMockDeckResponse = (
    id: number,
    indexNumber: number,
    isActive: boolean,
    cards: CardResponseDto[]
): DeckResponseDto => ({
    id,
    indexNumber,
    isActive,
    cards,
});


const createMockGetDecksResponse = (decks: DeckResponseDto[]): GetDecksResponseDto => ({
    decks,
});

describe('DeckController', () => {
    let controller: DeckController;
    let deckService: jest.Mocked<DeckService>;

    const mockDeckService = {
        getUserDecks: jest.fn(),
        changeDeckCards: jest.fn(),
        changeActiveDeck: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DeckController],
            providers: [
                {
                    provide: DeckService,
                    useValue: mockDeckService,
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<DeckController>(DeckController);
        deckService = module.get(DeckService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getDecks', () => {
        const userId = 'user-123';

        it('should return user decks', async () => {
            const request = createMockRequest(userId);
            const mockCards1 = [
                createMockCardResponse(1, 'arcane_shield', 1, true),
                createMockCardResponse(2, 'moon_staff', 2, true),
            ];
            const mockCards2 = [
                createMockCardResponse(3, 'axe_of_the_berserker', 1, true),
                createMockCardResponse(4, 'ring_of_light', 2, true),
            ];
            const mockDecks = [
                createMockDeckResponse(1, 1, true, mockCards1),
                createMockDeckResponse(2, 2, false, mockCards2),
            ];
            const mockResponse = createMockGetDecksResponse(mockDecks);

            deckService.getUserDecks.mockResolvedValue(mockResponse);

            const result = await controller.getDecks(request);

            expect(deckService.getUserDecks).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockResponse);
            expect(result.decks).toHaveLength(2);
            expect(result.decks[0].isActive).toBe(true);
            expect(result.decks[0].cards).toHaveLength(2);
            expect(result.decks[1].isActive).toBe(false);
        });

        it('should return empty decks array when user has no decks', async () => {
            const request = createMockRequest(userId);
            const mockResponse = createMockGetDecksResponse([]);

            deckService.getUserDecks.mockResolvedValue(mockResponse);

            const result = await controller.getDecks(request);

            expect(result.decks).toEqual([]);
        });

        it('should handle service error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Service error');

            deckService.getUserDecks.mockRejectedValue(error);

            await expect(controller.getDecks(request)).rejects.toThrow(error);
        });
    });

    describe('changeDeckCards', () => {
        const userId = 'user-123';
        const deckId = 1;
        
        const createCards = (): CardPosition[] => {
            const cards: CardPosition[] = [];
            for (let i = 1; i <= 14; i++) {
                cards.push({ cardId: i, position: i });
            }
            return cards;
        };

        const changeDeckCardsDto: ChangeDeckCardsDto = {
            deckId,
            cards: createCards(),
        };

        it('should change deck cards successfully', async () => {
            const request = createMockRequest(userId);

            deckService.changeDeckCards.mockResolvedValue(undefined);

            await controller.changeDeckCards(request, changeDeckCardsDto);

            expect(deckService.changeDeckCards).toHaveBeenCalledWith(userId, changeDeckCardsDto);
            expect(deckService.changeDeckCards).toHaveBeenCalledTimes(1);
        });

        it('should handle deck not found error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Deck not found');

            deckService.changeDeckCards.mockRejectedValue(error);

            await expect(controller.changeDeckCards(request, changeDeckCardsDto)).rejects.toThrow(error);
        });

        it('should handle invalid deck cards error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Invalid deck cards');

            deckService.changeDeckCards.mockRejectedValue(error);

            await expect(controller.changeDeckCards(request, changeDeckCardsDto)).rejects.toThrow(error);
        });

        it('should handle card not found error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Card not found');

            deckService.changeDeckCards.mockRejectedValue(error);

            await expect(controller.changeDeckCards(request, changeDeckCardsDto)).rejects.toThrow(error);
        });
    });

    describe('changeActiveDeck', () => {
        const userId = 'user-123';
        const changeActiveDeckDto: ChangeActiveDeckDto = { deckId: 2 };

        it('should change active deck successfully', async () => {
            const request = createMockRequest(userId);

            deckService.changeActiveDeck.mockResolvedValue(undefined);

            await controller.changeActiveDeck(request, changeActiveDeckDto);

            expect(deckService.changeActiveDeck).toHaveBeenCalledWith(userId, changeActiveDeckDto);
            expect(deckService.changeActiveDeck).toHaveBeenCalledTimes(1);
        });

        it('should handle deck not found error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Deck not found');

            deckService.changeActiveDeck.mockRejectedValue(error);

            await expect(controller.changeActiveDeck(request, changeActiveDeckDto)).rejects.toThrow(error);
        });

        it('should handle current active deck not found error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Current active deck not found');

            deckService.changeActiveDeck.mockRejectedValue(error);

            await expect(controller.changeActiveDeck(request, changeActiveDeckDto)).rejects.toThrow(error);
        });
    });

    describe('Error handling', () => {
        it('should propagate JwtAuthGuard errors', async () => {
            const guards = Reflect.getMetadata('__guards__', DeckController.prototype.getDecks);
            expect(guards).toBeDefined();
            expect(guards.some((guard: any) => guard.name === 'JwtAuthGuard')).toBe(true);
        });

        it('should have all endpoints protected by JwtAuthGuard', () => {
            const getDecksGuards = Reflect.getMetadata('__guards__', DeckController.prototype.getDecks);
            const changeDeckCardsGuards = Reflect.getMetadata('__guards__', DeckController.prototype.changeDeckCards);
            const changeActiveDeckGuards = Reflect.getMetadata('__guards__', DeckController.prototype.changeActiveDeck);
            
            expect(getDecksGuards).toBeDefined();
            expect(changeDeckCardsGuards).toBeDefined();
            expect(changeActiveDeckGuards).toBeDefined();
        });

        it('should handle service timeout errors', async () => {
            const request = createMockRequest('user-123');
            const error = new Error('Database timeout');

            deckService.getUserDecks.mockRejectedValue(error);

            await expect(controller.getDecks(request)).rejects.toThrow(error);
        });

        it('should handle authentication errors', async () => {
            const request = createMockRequest('user-123');
            const error = new Error('Unauthorized');

            deckService.getUserDecks.mockRejectedValue(error);

            await expect(controller.getDecks(request)).rejects.toThrow(error);
        });
    });

    describe('Response format', () => {
        const userId = 'user-123';

        it('should return GetDecksResponseDto for getDecks endpoint', async () => {
            const request = createMockRequest(userId);
            const mockCards = [createMockCardResponse(1, 'test_card', 1, true)];
            const mockDecks = [createMockDeckResponse(1, 1, true, mockCards)];
            const mockResponse = createMockGetDecksResponse(mockDecks);

            deckService.getUserDecks.mockResolvedValue(mockResponse);

            const result = await controller.getDecks(request);

            expect(result).toHaveProperty('decks');
            expect(Array.isArray(result.decks)).toBe(true);
            expect(result.decks[0]).toHaveProperty('id');
            expect(result.decks[0]).toHaveProperty('indexNumber');
            expect(result.decks[0]).toHaveProperty('isActive');
            expect(result.decks[0]).toHaveProperty('cards');
        });

        it('should properly transform deck card data in response', async () => {
            const request = createMockRequest(userId);
            const mockCard = {
                id: 10,
                innerCardId: 'legendary_sword',
                price: 500,
                isForSale: true,
                hasCard: true,
                maxHp: 50,
                skillCost: 3,
                type: 'attack',
                position: 1,
            };
            const mockDeck = {
                id: 1,
                indexNumber: 1,
                isActive: true,
                cards: [mockCard],
            };
            const mockResponse = { decks: [mockDeck] };

            deckService.getUserDecks.mockResolvedValue(mockResponse as GetDecksResponseDto);

            const result = await controller.getDecks(request);

            expect(result.decks[0].cards[0]).toMatchObject({
                id: 10,
                innerCardId: 'legendary_sword',
                price: 500,
                isForSale: true,
                hasCard: true,
                maxHp: 50,
                skillCost: 3,
                type: 'attack',
                position: 1,
            });
        });
    });

    describe('HTTP endpoints verification', () => {
        it('should have GET /decks endpoint', () => {
            expect(DeckController.prototype.getDecks).toBeDefined();
        });

        it('should have POST /decks/cards endpoint', () => {
            expect(DeckController.prototype.changeDeckCards).toBeDefined();
        });

        it('should have POST /decks endpoint', () => {
            expect(DeckController.prototype.changeActiveDeck).toBeDefined();
        });
    });
});

describe('DeckController (validation)', () => {
    let controller: DeckController;
    let deckService: jest.Mocked<DeckService>;

    const mockDeckService = {
        getUserDecks: jest.fn(),
        changeDeckCards: jest.fn(),
        changeActiveDeck: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DeckController],
            providers: [
                {
                    provide: DeckService,
                    useValue: mockDeckService,
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<DeckController>(DeckController);
        deckService = module.get(DeckService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Service method calls', () => {
        const userId = 'user-123';

        it('GET /decks should call getUserDecks with correct userId', async () => {
            const request = createMockRequest(userId);
            const mockResponse = createMockGetDecksResponse([]);

            deckService.getUserDecks.mockResolvedValue(mockResponse);

            await controller.getDecks(request);

            expect(deckService.getUserDecks).toHaveBeenCalledWith(userId);
        });

        it('POST /decks/cards should call changeDeckCards with correct parameters', async () => {
            const request = createMockRequest(userId);
            const changeDeckCardsDto: ChangeDeckCardsDto = {
                deckId: 1,
                cards: [{ cardId: 1, position: 1 }],
            };

            deckService.changeDeckCards.mockResolvedValue(undefined);

            await controller.changeDeckCards(request, changeDeckCardsDto);

            expect(deckService.changeDeckCards).toHaveBeenCalledWith(userId, changeDeckCardsDto);
        });

        it('POST /decks should call changeActiveDeck with correct parameters', async () => {
            const request = createMockRequest(userId);
            const changeActiveDeckDto: ChangeActiveDeckDto = { deckId: 2 };

            deckService.changeActiveDeck.mockResolvedValue(undefined);

            await controller.changeActiveDeck(request, changeActiveDeckDto);

            expect(deckService.changeActiveDeck).toHaveBeenCalledWith(userId, changeActiveDeckDto);
        });
    });

    describe('Return values', () => {
        it('getDecks should return GetDecksResponseDto', async () => {
            const request = createMockRequest('user-123');
            const mockResponse = createMockGetDecksResponse([]);

            deckService.getUserDecks.mockResolvedValue(mockResponse);

            const result = await controller.getDecks(request);

            expect(result).toBe(mockResponse);
        });

        it('changeDeckCards should return void', async () => {
            const request = createMockRequest('user-123');
            const dto: ChangeDeckCardsDto = { deckId: 1, cards: [] };

            deckService.changeDeckCards.mockResolvedValue(undefined);

            const result = await controller.changeDeckCards(request, dto);

            expect(result).toBeUndefined();
        });

        it('changeActiveDeck should return void', async () => {
            const request = createMockRequest('user-123');
            const dto: ChangeActiveDeckDto = { deckId: 1 };

            deckService.changeActiveDeck.mockResolvedValue(undefined);

            const result = await controller.changeActiveDeck(request, dto);

            expect(result).toBeUndefined();
        });
    });
});