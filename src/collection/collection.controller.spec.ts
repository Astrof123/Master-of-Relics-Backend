import { Test, TestingModule } from '@nestjs/testing';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { BuyCardDto } from './dto/buy-card.dto';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CardResponseDto } from './dto/card-response.dto';


const createMockRequest = (userId: string = 'user-123'): any => ({
    user: { userId },
    headers: {},
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
});


const createMockCollectionResponse = (cards: Partial<CardResponseDto>[] = []): CollectionResponseDto => ({
    cards: cards as CardResponseDto[],
});


const createMockCardResponse = (id: number, innerCardId: string, hasCard: boolean = false): CardResponseDto => ({
    id,
    innerCardId,
    price: 100,
    isForSale: true,
    hasCard,
    maxHp: 30,
    skillCost: 2,
    type: 'attack',
});

describe('CollectionController', () => {
    let controller: CollectionController;
    let collectionService: jest.Mocked<CollectionService>;

    const mockCollectionService = {
        getUserCollection: jest.fn(),
        buyCard: jest.fn(),
    };

    const defaultBuyCardDto: BuyCardDto = { cardId: 5 };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CollectionController],
            providers: [
                {
                    provide: CollectionService,
                    useValue: mockCollectionService,
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<CollectionController>(CollectionController);
        collectionService = module.get(CollectionService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('me', () => {
        const userId = 'user-123';

        it('should return user collection', async () => {
            const request = createMockRequest(userId);
            const mockCards = [
                createMockCardResponse(1, 'arcane_shield', true),
                createMockCardResponse(2, 'moon_staff', false),
                createMockCardResponse(3, 'axe_of_the_berserker', true),
            ];
            const mockCollection = createMockCollectionResponse(mockCards);

            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            const result = await controller.me(request);

            expect(collectionService.getUserCollection).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockCollection);
            expect(result.cards).toHaveLength(3);
        });

        it('should return empty collection when user has no cards', async () => {
            const request = createMockRequest(userId);
            const mockCollection = createMockCollectionResponse([]);

            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            const result = await controller.me(request);

            expect(result.cards).toEqual([]);
        });

        it('should handle service error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Service error');

            collectionService.getUserCollection.mockRejectedValue(error);

            await expect(controller.me(request)).rejects.toThrow(error);
        });
    });

    describe('buyCard', () => {
        const userId = 'user-123';
        const cardId = 5;
        const buyCardDto: BuyCardDto = { cardId };

        it('should buy card and return updated collection', async () => {
            const request = createMockRequest(userId);
            const mockCardsAfterPurchase = [
                createMockCardResponse(1, 'arcane_shield', true),
                createMockCardResponse(2, 'moon_staff', true),
                createMockCardResponse(5, 'new_card', true),
            ];
            const mockCollection = createMockCollectionResponse(mockCardsAfterPurchase);

            collectionService.buyCard.mockResolvedValue(undefined);
            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            const result = await controller.buyCard(request, buyCardDto);

            expect(collectionService.buyCard).toHaveBeenCalledWith(userId, cardId);
            expect(collectionService.getUserCollection).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockCollection);
            expect(result.cards).toHaveLength(3);
        });

        it('should handle buying card that user already owns', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Card already in collection');

            collectionService.buyCard.mockRejectedValue(error);

            await expect(controller.buyCard(request, buyCardDto)).rejects.toThrow(error);
            expect(collectionService.getUserCollection).not.toHaveBeenCalled();
        });

        it('should handle insufficient gold error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Not enough gold');

            collectionService.buyCard.mockRejectedValue(error);

            await expect(controller.buyCard(request, buyCardDto)).rejects.toThrow(error);
            expect(collectionService.getUserCollection).not.toHaveBeenCalled();
        });

        it('should handle card not found error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Card not found');

            collectionService.buyCard.mockRejectedValue(error);

            await expect(controller.buyCard(request, buyCardDto)).rejects.toThrow(error);
        });

        it('should handle card not for sale error', async () => {
            const request = createMockRequest(userId);
            const error = new Error('Card is not for sale');

            collectionService.buyCard.mockRejectedValue(error);

            await expect(controller.buyCard(request, buyCardDto)).rejects.toThrow(error);
        });

        it('should handle user not found error', async () => {
            const request = createMockRequest('non-existent-user');
            const buyCardDtoLocal: BuyCardDto = { cardId: 5 };
            const error = new Error('User not found');

            collectionService.buyCard.mockRejectedValue(error);

            await expect(controller.buyCard(request, buyCardDtoLocal)).rejects.toThrow(error);
        });
    });

    describe('Error handling', () => {
        it('should propagate JwtAuthGuard errors', async () => {
            const guards = Reflect.getMetadata('__guards__', CollectionController.prototype.me);
            expect(guards).toBeDefined();
            expect(guards.some((guard: any) => guard.name === 'JwtAuthGuard')).toBe(true);
        });

        it('should have both endpoints protected by JwtAuthGuard', () => {
            const meGuards = Reflect.getMetadata('__guards__', CollectionController.prototype.me);
            const buyCardGuards = Reflect.getMetadata('__guards__', CollectionController.prototype.buyCard);
            
            expect(meGuards).toBeDefined();
            expect(buyCardGuards).toBeDefined();
        });
    });

    describe('Response format', () => {
        it('should return CollectionResponseDto for me endpoint', async () => {
            const request = createMockRequest('user-123');
            const mockCollection = createMockCollectionResponse([
                createMockCardResponse(1, 'test_card', true),
            ]);

            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            const result = await controller.me(request);

            expect(result).toHaveProperty('cards');
            expect(Array.isArray(result.cards)).toBe(true);
        });

        it('should return CollectionResponseDto for buyCard endpoint', async () => {
            const request = createMockRequest('user-123');
            const buyCardDtoLocal: BuyCardDto = { cardId: 1 };
            const mockCollection = createMockCollectionResponse([
                createMockCardResponse(1, 'test_card', true),
            ]);

            collectionService.buyCard.mockResolvedValue(undefined);
            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            const result = await controller.buyCard(request, buyCardDtoLocal);

            expect(result).toHaveProperty('cards');
            expect(Array.isArray(result.cards)).toBe(true);
        });

        it('should properly transform card data in response', async () => {
            const request = createMockRequest('user-123');
            const mockCard = {
                id: 10,
                innerCardId: 'legendary_sword',
                price: 500,
                isForSale: true,
                hasCard: true,
                maxHp: 50,
                skillCost: 3,
                type: 'attack',
            };
            const mockCollection = createMockCollectionResponse([mockCard]);

            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            const result = await controller.me(request);

            expect(result.cards[0]).toMatchObject({
                id: 10,
                innerCardId: 'legendary_sword',
                price: 500,
                isForSale: true,
                hasCard: true,
                maxHp: 50,
                skillCost: 3,
                type: 'attack',
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle buying card with invalid card ID', async () => {
            const request = createMockRequest('user-123');
            const invalidDto: BuyCardDto = { cardId: -1 };
            const error = new Error('Card not found');

            collectionService.buyCard.mockRejectedValue(error);

            await expect(controller.buyCard(request, invalidDto)).rejects.toThrow(error);
        });

        it('should handle buying card when user has no gold', async () => {
            const request = createMockRequest('user-123');
            const buyCardDtoLocal: BuyCardDto = { cardId: 5 };
            const error = new Error('Not enough gold');

            collectionService.buyCard.mockRejectedValue(error);

            await expect(controller.buyCard(request, buyCardDtoLocal)).rejects.toThrow(error);
        });

        it('should handle service timeout errors', async () => {
            const request = createMockRequest('user-123');
            const error = new Error('Database timeout');

            collectionService.getUserCollection.mockRejectedValue(error);

            await expect(controller.me(request)).rejects.toThrow(error);
        });
    });
});

describe('CollectionController (validation)', () => {
    let controller: CollectionController;
    let collectionService: jest.Mocked<CollectionService>;

    const mockCollectionService = {
        getUserCollection: jest.fn(),
        buyCard: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CollectionController],
            providers: [
                {
                    provide: CollectionService,
                    useValue: mockCollectionService,
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<CollectionController>(CollectionController);
        collectionService = module.get(CollectionService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('HTTP endpoints', () => {
        it('GET /collection/own should call getUserCollection', async () => {
            const request = createMockRequest('user-123');
            const mockCollection = createMockCollectionResponse([]);

            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            await controller.me(request);

            expect(collectionService.getUserCollection).toHaveBeenCalledWith('user-123');
        });

        it('POST /collection/purchase should call buyCard and then getUserCollection', async () => {
            const request = createMockRequest('user-123');
            const buyCardDtoLocal: BuyCardDto = { cardId: 10 };
            const mockCollection = createMockCollectionResponse([]);

            collectionService.buyCard.mockResolvedValue(undefined);
            collectionService.getUserCollection.mockResolvedValue(mockCollection);

            await controller.buyCard(request, buyCardDtoLocal);

            expect(collectionService.buyCard).toHaveBeenCalledWith('user-123', 10);
            expect(collectionService.getUserCollection).toHaveBeenCalledWith('user-123');
        });
    });
});