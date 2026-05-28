import { forwardRef, Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { CardsService } from './cards.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCollection } from './entities/collection.entity';
import { Card } from './entities/card.entity';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';
import { Deck } from './entities/deck.entity';
import { DeckCard } from './entities/deck-card.entity';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserCollection]),
        TypeOrmModule.forFeature([Card]),
        TypeOrmModule.forFeature([User]),
        TypeOrmModule.forFeature([Deck]),
        TypeOrmModule.forFeature([DeckCard]),
        forwardRef(() => UsersModule),
    ],
    providers: [CollectionService, CardsService, DeckService],
    controllers: [CollectionController, DeckController],
    exports: [CardsService, CollectionService, DeckService],
})
export class CollectionModule {}
