import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type AuthenticatedRequest from 'src/shared/types/authenticated-request';
import { CollectionService } from './collection.service';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { BuyCardDto } from './dto/buy-card.dto';

@Controller('collection')
export class CollectionController {
    constructor(private readonly collectionService: CollectionService) {}

    @Get('own')
    @ApiOperation({ summary: 'Получить свою коллекцию' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async me(@Req() request: AuthenticatedRequest): Promise<CollectionResponseDto> {
        const userId = request.user.userId;
        const collection = await this.collectionService.getUserCollection(userId);

        return collection;
    }

    @Post('purchase')
    @ApiOperation({ summary: 'Купить карту' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async buyCard(@Req() request: AuthenticatedRequest, @Body() buyCardDto: BuyCardDto): Promise<CollectionResponseDto> {
        const userId = request.user.userId;
        
        await this.collectionService.buyCard(userId, buyCardDto.cardId);
        const collection = await this.collectionService.getUserCollection(userId);
        return collection;
    }
}
