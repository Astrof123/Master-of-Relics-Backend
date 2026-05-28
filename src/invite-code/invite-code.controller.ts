import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type AuthenticatedRequest from 'src/shared/types/authenticated-request';
import { GetInviteCodesDto } from './dtos/get-invite-codes.dto';
import { InviteCodeService } from './invite-code.service';
import { GetReportsResponseDto } from 'src/users/dto/get-reports-response.dto';
import { InviteCodeDto } from './dtos/invite-code.dto';
import { plainToInstance } from 'class-transformer';
import { GetInviteCodesResponseDto } from './dtos/get-invite-codes-response';
import { CreateInviteCodesDto } from './dtos/create-invite-codes.dto';
import { ChangeStatusDto } from './dtos/change-status.dto';
import { DeleteInviteCodeDto } from './dtos/delete-invite-code.dto';

@Controller('invite-codes')
export class InviteCodeController {
    constructor(private readonly inviteCodeService: InviteCodeService) {}

    @Post('status')
    @ApiOperation({ summary: 'Изменить статус инвайт-кода' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async changeStatus(
        @Req() request: AuthenticatedRequest,
        @Body(ValidationPipe) data: ChangeStatusDto,
    ) {
        await this.inviteCodeService.changeStatus(data);
    }

    @Get()
    @ApiOperation({ summary: 'Получить все инвайт коды (с пагинацией)' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getInviteCodes(
        @Req() request: AuthenticatedRequest,
        @Query(ValidationPipe) getInviteCodesDto: GetInviteCodesDto,
    ) {
        const result =
            await this.inviteCodeService.getInviteCodes(getInviteCodesDto);
        const resultDto: GetInviteCodesResponseDto = {
            ...result,
            data: result.data.map((inviteCode) =>
                plainToInstance(InviteCodeDto, inviteCode, {
                    excludeExtraneousValues: true,
                }),
            ),
        };

        return resultDto;
    }

    @Post()
    @ApiOperation({ summary: 'Сгенерировать инвайт коды' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async createInviteCodes(
        @Req() request: AuthenticatedRequest,
        @Body(ValidationPipe) data: CreateInviteCodesDto,
    ) {
        const result = await this.inviteCodeService.createInviteCodes(data);
        const resultDto: InviteCodeDto[] = result.map((inviteCode) =>
            plainToInstance(InviteCodeDto, inviteCode, {
                excludeExtraneousValues: true,
            }),
        );

        return resultDto;
    }

    @Delete('/:id')
    @ApiOperation({ summary: 'Удалить инвайт-код' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async deleteInviteCode(
        @Req() request: AuthenticatedRequest,
        @Param('id') id: string,
    ) {
        await this.inviteCodeService.deleteInviteCode(id);
    }
}
