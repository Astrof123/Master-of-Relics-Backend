import { Body, Controller, Get, Param, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type AuthenticatedRequest from 'src/shared/types/authenticated-request';
import { CollectionService } from './collection.service';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { BuyCardDto } from './dto/buy-card.dto';
import { DeckService } from './deck.service';
import { GetDecksResponseDto } from './dto/get-decks-response.dto';
import { ChangeDeckCardsDto } from './dto/change-deck-cards.dto';
import { ChangeActiveDeckDto } from './dto/change-active-deck.dto';

@Controller('decks')
export class DeckController {
    constructor(private readonly deckService: DeckService) {}

    @Get()
    @ApiOperation({ summary: 'Получить свои колоды' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async getDecks(@Req() request: AuthenticatedRequest): Promise<GetDecksResponseDto> {
        const userId = request.user.userId;
        const decks = await this.deckService.getUserDecks(userId);

        return decks;
    }

    @Post('cards')
    @ApiOperation({ summary: 'Поменять карты в колоде' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async changeDeckCards(
        @Req() request: AuthenticatedRequest, 
        @Body(ValidationPipe) data: ChangeDeckCardsDto
    ) {
        const userId = request.user.userId;
        await this.deckService.changeDeckCards(userId, data);
    }

    @Post()
    @ApiOperation({ summary: 'Поменять активную колоду' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    async changeActiveDeck(
        @Req() request: AuthenticatedRequest, 
        @Body(ValidationPipe) data: ChangeActiveDeckDto
    ) {
        const userId = request.user.userId;
        await this.deckService.changeActiveDeck(userId, data);
    }
}
