import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomHttpException } from 'src/common/custom-http.exception';

export class CardNotFoundException extends CustomHttpException {
    constructor() {
        super('Карта не найдена', HttpStatus.NOT_FOUND);
    }
}

export class CardAlreadyExistException extends CustomHttpException {
    constructor() {
        super('Карта уже в коллекции', HttpStatus.BAD_REQUEST);
    }
}

export class CardNotForSaleException extends CustomHttpException {
    constructor() {
        super('Карта недоступна для продажи', HttpStatus.BAD_REQUEST);
    }
}

export class NotEnoughGoldException extends CustomHttpException {
    constructor() {
        super('Недостаточно золота', HttpStatus.BAD_REQUEST);
    }
}
