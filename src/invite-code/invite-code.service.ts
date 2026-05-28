import { Injectable } from '@nestjs/common';
import { GetInviteCodesDto } from './dtos/get-invite-codes.dto';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteCode } from './entities/invite-code.entity';
import { CreateInviteCodesDto } from './dtos/create-invite-codes.dto';
import { ChangeStatusDto } from './dtos/change-status.dto';
import { InviteCodeNotFoundException } from './exceptions/invite-code.exception';
import { DeleteInviteCodeDto } from './dtos/delete-invite-code.dto';
import { INVITE_CODE_STATUS } from './types/invite-code';

@Injectable()
export class InviteCodeService {
    constructor(
        @InjectRepository(InviteCode)
        private inviteCodeRepository: Repository<InviteCode>,
    ) {}

    async getInviteCodes(data: GetInviteCodesDto) {
        const page = Number(data.page) || 1;
        const limit = Number(data.limit) || 10;
        const inviteCodeId = data.inviteCodeId;
        const startDate = data.startDate;
        const endDate = data.endDate;
        const status = data.status;

        const skip = (page - 1) * limit;

        const queryBuilder = this.inviteCodeRepository
            .createQueryBuilder('inviteCode')
            .leftJoinAndSelect('inviteCode.user', 'user');

        if (inviteCodeId) {
            queryBuilder.andWhere(
                'CAST(inviteCode.id AS TEXT) LIKE :inviteCodeId',
                { inviteCodeId: `%${inviteCodeId}%` },
            );
        }

        if (status) {
            queryBuilder.andWhere('inviteCode.status = :status', {
                status: status,
            });
        }

        if (startDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            queryBuilder.andWhere('inviteCode.createdAt >= :startDate', {
                startDate: startDateTime,
            });
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            queryBuilder.andWhere('inviteCode.createdAt <= :endDate', {
                endDate: endDateTime,
            });
        }

        queryBuilder.orderBy(`inviteCode.createdAt`, 'DESC');

        queryBuilder.skip(skip).take(limit);

        const [inviteCodes, total] = await queryBuilder.getManyAndCount();

        return {
            data: inviteCodes,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async createInviteCodes(data: CreateInviteCodesDto) {
        const invideCodes: InviteCode[] = [];
        for (let i = 0; i < data.count; i++) {
            const inviteCode = await this.inviteCodeRepository.create({
                status: INVITE_CODE_STATUS.FREE,
            });
            await this.inviteCodeRepository.save(inviteCode);
            invideCodes.push(inviteCode);
        }

        return invideCodes;
    }

    async changeStatus(data: ChangeStatusDto) {
        const inviteCode = await this.inviteCodeRepository.findOne({
            where: { id: data.inviteCodeId },
        });

        if (!inviteCode) {
            throw new InviteCodeNotFoundException();
        }

        inviteCode.status = data.newStatus;
        await this.inviteCodeRepository.save(inviteCode);
    }

    async deleteInviteCode(id: string) {
        const inviteCode = await this.inviteCodeRepository.findOne({
            where: { id: id },
        });

        if (!inviteCode) {
            throw new InviteCodeNotFoundException();
        }

        await this.inviteCodeRepository.softDelete(inviteCode.id);
    }
}
