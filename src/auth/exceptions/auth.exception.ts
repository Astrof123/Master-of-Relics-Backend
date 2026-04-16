import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomHttpException } from 'src/common/custom-http.exception';

export class UserAlreadyExistsException extends CustomHttpException {
    constructor() {
        super('Пользователь с таким логином уже существует', HttpStatus.CONFLICT);
    }
}

export class InvalidCredentialsException extends CustomHttpException {
    constructor() {
        super('Неверный логин или пароль', HttpStatus.UNAUTHORIZED);
    }
}

export class InvalidTokenException extends CustomHttpException {
    constructor() {
        super('Вы не авторизованы', HttpStatus.UNAUTHORIZED);
    }
}