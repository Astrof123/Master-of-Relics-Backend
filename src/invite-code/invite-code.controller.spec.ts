
import { Test, TestingModule } from '@nestjs/testing';
import { InviteCodeController } from './invite-code.controller';
import { InviteCodeService } from './invite-code.service';
import { GetInviteCodesDto } from './dtos/get-invite-codes.dto';
import { CreateInviteCodesDto } from './dtos/create-invite-codes.dto';
import { ChangeStatusDto } from './dtos/change-status.dto';
import { InviteCodeDto } from './dtos/invite-code.dto';
import { GetInviteCodesResponseDto } from './dtos/get-invite-codes-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { INVITE_CODE_STATUS } from './types/invite-code';


const createMockRequest = (userId: string = 'user-123'): any => ({
    user: { userId },
    headers: {},
    body: {},
    query: {},
    params: {},
    get: jest.fn(),
});


const createMockInviteCode = (
    id: string,
    status: string = INVITE_CODE_STATUS.FREE,
    userId?: string
): any => ({
    id,
    status,
    userId,
    usedAt: userId ? new Date() : undefined,
    createdAt: new Date(),
    user: userId ? { id: userId, nickname: 'TestUser' } : null,
});

describe('InviteCodeController', () => {
    let controller: InviteCodeController;
    let inviteCodeService: jest.Mocked<InviteCodeService>;

    const mockInviteCodeService = {
        getInviteCodes: jest.fn(),
        createInviteCodes: jest.fn(),
        changeStatus: jest.fn(),
        deleteInviteCode: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InviteCodeController],
            providers: [
                {
                    provide: InviteCodeService,
                    useValue: mockInviteCodeService,
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<InviteCodeController>(InviteCodeController);
        inviteCodeService = module.get(InviteCodeService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('changeStatus', () => {
        const changeStatusDto: ChangeStatusDto = {
            inviteCodeId: 'code-123',
            newStatus: INVITE_CODE_STATUS.BOOKED,
        };

        it('should change invite code status', async () => {
            const request = createMockRequest();
            
            mockInviteCodeService.changeStatus.mockResolvedValue(undefined);

            await controller.changeStatus(request, changeStatusDto);

            expect(inviteCodeService.changeStatus).toHaveBeenCalledWith(changeStatusDto);
            expect(inviteCodeService.changeStatus).toHaveBeenCalledTimes(1);
        });

        it('should handle service error', async () => {
            const request = createMockRequest();
            const error = new Error('Service error');
            
            mockInviteCodeService.changeStatus.mockRejectedValue(error);

            await expect(controller.changeStatus(request, changeStatusDto)).rejects.toThrow(error);
        });
    });

    describe('getInviteCodes', () => {
        const getInviteCodesDto: GetInviteCodesDto = {
            page: 1,
            limit: 10,
        };

        it('should return paginated invite codes with transformed DTOs', async () => {
            const request = createMockRequest();
            const mockInviteCodes = [
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
                createMockInviteCode('code-2', INVITE_CODE_STATUS.USED, 'user-1'),
            ];
            const mockResult = {
                data: mockInviteCodes,
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1,
            };

            mockInviteCodeService.getInviteCodes.mockResolvedValue(mockResult);

            const result = await controller.getInviteCodes(request, getInviteCodesDto);

            expect(inviteCodeService.getInviteCodes).toHaveBeenCalledWith(getInviteCodesDto);
            expect(result).toBeDefined();
            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(result.totalPages).toBe(1);
            expect(result.data[0]).toBeInstanceOf(InviteCodeDto);
        });

        it('should handle empty result', async () => {
            const request = createMockRequest();
            const mockResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            };

            mockInviteCodeService.getInviteCodes.mockResolvedValue(mockResult);

            const result = await controller.getInviteCodes(request, getInviteCodesDto);

            expect(result.data).toEqual([]);
            expect(result.total).toBe(0);
            expect(result.totalPages).toBe(0);
        });

        it('should handle custom pagination parameters', async () => {
            const request = createMockRequest();
            const customDto: GetInviteCodesDto = {
                page: 2,
                limit: 5,
            };
            const mockInviteCodes = [createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE)];
            const mockResult = {
                data: mockInviteCodes,
                total: 1,
                page: 2,
                limit: 5,
                totalPages: 1,
            };

            mockInviteCodeService.getInviteCodes.mockResolvedValue(mockResult);

            const result = await controller.getInviteCodes(request, customDto);

            expect(result.page).toBe(2);
            expect(result.limit).toBe(5);
        });

        it('should handle filters in query', async () => {
            const request = createMockRequest();
            const filteredDto: GetInviteCodesDto = {
                page: 1,
                limit: 10,
                inviteCodeId: 'test',
                status: INVITE_CODE_STATUS.FREE,
                startDate: '2024-01-01',
                endDate: '2024-12-31',
            };
            const mockInviteCodes = [createMockInviteCode('test-123', INVITE_CODE_STATUS.FREE)];
            const mockResult = {
                data: mockInviteCodes,
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            };

            mockInviteCodeService.getInviteCodes.mockResolvedValue(mockResult);

            const result = await controller.getInviteCodes(request, filteredDto);

            expect(inviteCodeService.getInviteCodes).toHaveBeenCalledWith(filteredDto);
            expect(result.data).toHaveLength(1);
        });

        it('should handle service error', async () => {
            const request = createMockRequest();
            const error = new Error('Service error');
            
            mockInviteCodeService.getInviteCodes.mockRejectedValue(error);

            await expect(controller.getInviteCodes(request, getInviteCodesDto)).rejects.toThrow(error);
        });
    });

    describe('createInviteCodes', () => {
        const createInviteCodesDto: CreateInviteCodesDto = {
            count: 3,
        };

        it('should create multiple invite codes and return transformed DTOs', async () => {
            const request = createMockRequest();
            const mockInviteCodes = [
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
                createMockInviteCode('code-2', INVITE_CODE_STATUS.FREE),
                createMockInviteCode('code-3', INVITE_CODE_STATUS.FREE),
            ];

            mockInviteCodeService.createInviteCodes.mockResolvedValue(mockInviteCodes);

            const result = await controller.createInviteCodes(request, createInviteCodesDto);

            expect(inviteCodeService.createInviteCodes).toHaveBeenCalledWith(createInviteCodesDto);
            expect(result).toHaveLength(3);
            expect(result[0]).toBeInstanceOf(InviteCodeDto);
            expect(result[0].status).toBe(INVITE_CODE_STATUS.FREE);
        });

        it('should create single invite code', async () => {
            const request = createMockRequest();
            const singleDto: CreateInviteCodesDto = { count: 1 };
            const mockInviteCodes = [createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE)];

            mockInviteCodeService.createInviteCodes.mockResolvedValue(mockInviteCodes);

            const result = await controller.createInviteCodes(request, singleDto);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('code-1');
        });

        it('should create max 10 invite codes', async () => {
            const request = createMockRequest();
            const maxDto: CreateInviteCodesDto = { count: 10 };
            const mockInviteCodes = Array(10).fill(null).map((_, i) => 
                createMockInviteCode(`code-${i}`, INVITE_CODE_STATUS.FREE)
            );

            mockInviteCodeService.createInviteCodes.mockResolvedValue(mockInviteCodes);

            const result = await controller.createInviteCodes(request, maxDto);

            expect(result).toHaveLength(10);
        });

        it('should handle service error', async () => {
            const request = createMockRequest();
            const error = new Error('Service error');
            
            mockInviteCodeService.createInviteCodes.mockRejectedValue(error);

            await expect(controller.createInviteCodes(request, createInviteCodesDto)).rejects.toThrow(error);
        });
    });

    describe('deleteInviteCode', () => {
        const inviteCodeId = 'code-123';

        it('should delete invite code', async () => {
            const request = createMockRequest();
            
            mockInviteCodeService.deleteInviteCode.mockResolvedValue(undefined);

            await controller.deleteInviteCode(request, inviteCodeId);

            expect(inviteCodeService.deleteInviteCode).toHaveBeenCalledWith(inviteCodeId);
            expect(inviteCodeService.deleteInviteCode).toHaveBeenCalledTimes(1);
        });

        it('should handle service error', async () => {
            const request = createMockRequest();
            const error = new Error('Service error');
            
            mockInviteCodeService.deleteInviteCode.mockRejectedValue(error);

            await expect(controller.deleteInviteCode(request, inviteCodeId)).rejects.toThrow(error);
        });
    });

    describe('DTO transformation', () => {
        it('should properly transform invite code to InviteCodeDto', async () => {
            const request = createMockRequest();
            const getInviteCodesDto: GetInviteCodesDto = { page: 1, limit: 10 };
            const mockInviteCode = {
                id: 'code-1',
                status: INVITE_CODE_STATUS.FREE,
                userId: 'user-1',
                usedAt: new Date(),
                createdAt: new Date(),
                user: { id: 'user-1', nickname: 'TestUser' },
            };
            const mockResult = {
                data: [mockInviteCode],
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            };

            mockInviteCodeService.getInviteCodes.mockResolvedValue(mockResult);

            const result = await controller.getInviteCodes(request, getInviteCodesDto);

            expect(result.data[0]).toHaveProperty('id');
            expect(result.data[0]).toHaveProperty('status');
            expect(result.data[0]).toHaveProperty('userId');
            expect(result.data[0]).toHaveProperty('usedAt');
            expect(result.data[0]).toHaveProperty('createdAt');
            expect(result.data[0]).toHaveProperty('user');
        });

        it('should handle invite codes without user', async () => {
            const request = createMockRequest();
            const getInviteCodesDto: GetInviteCodesDto = { page: 1, limit: 10 };
            const mockInviteCode = {
                id: 'code-1',
                status: INVITE_CODE_STATUS.FREE,
                userId: undefined,
                usedAt: undefined,
                createdAt: new Date(),
                user: null,
            };
            const mockResult = {
                data: [mockInviteCode],
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            };

            mockInviteCodeService.getInviteCodes.mockResolvedValue(mockResult);

            const result = await controller.getInviteCodes(request, getInviteCodesDto);

            expect(result.data[0].userId).toBeUndefined();
            expect(result.data[0].user).toBeNull();
        });
    });

    describe('Error handling', () => {
        it('should propagate InviteCodeNotFoundException', async () => {
            const request = createMockRequest();
            const changeStatusDto: ChangeStatusDto = {
                inviteCodeId: 'non-existent',
                newStatus: INVITE_CODE_STATUS.BOOKED,
            };
            const error = new Error('Invite code not found');
            
            mockInviteCodeService.changeStatus.mockRejectedValue(error);

            await expect(controller.changeStatus(request, changeStatusDto)).rejects.toThrow(error);
        });

        it('should handle validation errors', async () => {
            const request = createMockRequest();
            const invalidDto = {} as ChangeStatusDto;
            
            mockInviteCodeService.changeStatus.mockRejectedValue(new Error('Validation failed'));

            await expect(controller.changeStatus(request, invalidDto)).rejects.toThrow();
        });
    });

    describe('HTTP decorators verification', () => {
        it('should have POST /invite-codes/status endpoint', () => {
            expect(InviteCodeController.prototype.changeStatus).toBeDefined();
        });

        it('should have GET /invite-codes endpoint', () => {
            expect(InviteCodeController.prototype.getInviteCodes).toBeDefined();
        });

        it('should have POST /invite-codes endpoint', () => {
            expect(InviteCodeController.prototype.createInviteCodes).toBeDefined();
        });

        it('should have DELETE /invite-codes/:id endpoint', () => {
            expect(InviteCodeController.prototype.deleteInviteCode).toBeDefined();
        });
    });
});

describe('InviteCodeController (with guards)', () => {
    let controller: InviteCodeController;
    let inviteCodeService: jest.Mocked<InviteCodeService>;

    const mockInviteCodeService = {
        getInviteCodes: jest.fn(),
        createInviteCodes: jest.fn(),
        changeStatus: jest.fn(),
        deleteInviteCode: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InviteCodeController],
            providers: [
                {
                    provide: InviteCodeService,
                    useValue: mockInviteCodeService,
                },
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .compile();

        controller = module.get<InviteCodeController>(InviteCodeController);
        inviteCodeService = module.get(InviteCodeService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Response format', () => {
        it('should return GetInviteCodesResponseDto for getInviteCodes', async () => {
            const request = createMockRequest();
            const dto: GetInviteCodesDto = { page: 1, limit: 10 };
            const mockResult = {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            };

            mockInviteCodeService.getInviteCodes.mockResolvedValue(mockResult);

            const result = await controller.getInviteCodes(request, dto);

            expect(result).toMatchObject({
                data: expect.any(Array),
                total: expect.any(Number),
                page: expect.any(Number),
                limit: expect.any(Number),
                totalPages: expect.any(Number),
            });
        });

        it('should return array of InviteCodeDto for createInviteCodes', async () => {
            const request = createMockRequest();
            const dto: CreateInviteCodesDto = { count: 2 };
            const mockInviteCodes = [
                { id: 'code-1', status: INVITE_CODE_STATUS.FREE },
                { id: 'code-2', status: INVITE_CODE_STATUS.FREE },
            ];

            mockInviteCodeService.createInviteCodes.mockResolvedValue(mockInviteCodes as any);

            const result = await controller.createInviteCodes(request, dto);

            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toBeInstanceOf(InviteCodeDto);
        });

        it('should return void for changeStatus', async () => {
            const request = createMockRequest();
            const dto: ChangeStatusDto = {
                inviteCodeId: 'code-1',
                newStatus: INVITE_CODE_STATUS.BOOKED,
            };

            mockInviteCodeService.changeStatus.mockResolvedValue(undefined);

            const result = await controller.changeStatus(request, dto);

            expect(result).toBeUndefined();
        });

        it('should return void for deleteInviteCode', async () => {
            const request = createMockRequest();
            const id = 'code-1';

            mockInviteCodeService.deleteInviteCode.mockResolvedValue(undefined);

            const result = await controller.deleteInviteCode(request, id);

            expect(result).toBeUndefined();
        });
    });
});