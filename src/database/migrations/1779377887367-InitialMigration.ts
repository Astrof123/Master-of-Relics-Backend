import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1779377887367 implements MigrationInterface {
    name = 'InitialMigration1779377887367'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users_stats" ("id" SERIAL NOT NULL, "totalGames" integer NOT NULL DEFAULT '0', "wins" integer NOT NULL DEFAULT '0', "winSeries" integer NOT NULL DEFAULT '0', "userId" uuid NOT NULL, CONSTRAINT "REL_3d6cc217af2451426c44a30e67" UNIQUE ("userId"), CONSTRAINT "PK_44924448d5896c2364a4c6ddf75" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "friend_relationships" ("id" SERIAL NOT NULL, "requesterId" uuid NOT NULL, "addresseeId" uuid NOT NULL, "status" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_0c56355c9ef6c5365f26c27b386" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" SERIAL NOT NULL, "text" character varying NOT NULL, "reportType" character varying NOT NULL, "isProcessed" boolean NOT NULL DEFAULT false, "reportedUserId" uuid NOT NULL, "requesterUserId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invite-codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "status" character varying NOT NULL, "usedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_0bc61299c82a4bded03efac4546" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "deck-cards" ("id" SERIAL NOT NULL, "deckId" integer NOT NULL, "cardId" integer NOT NULL, "position" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_1d3cd36c3209b49d3d469c90d69" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "decks" ("id" SERIAL NOT NULL, "userId" uuid NOT NULL, "isActive" boolean NOT NULL, "indexNumber" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_981894e3f8dbe5049ac59cb1af1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nickname" character varying(30) NOT NULL, "login" character varying(30) NOT NULL, "friendCode" character varying(10) NOT NULL, "password" character varying NOT NULL, "banReason" text, "bannedUntil" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "isAdmin" boolean NOT NULL DEFAULT false, "isSuperAdmin" boolean NOT NULL DEFAULT false, "gold" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_2d443082eccd5198f95f2a36e2c" UNIQUE ("login"), CONSTRAINT "UQ_2505cff8b090c75a8b93d6786a7" UNIQUE ("friendCode"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2d443082eccd5198f95f2a36e2" ON "users"  ("login") `);
        await queryRunner.query(`CREATE TABLE "user_collections" ("id" SERIAL NOT NULL, "userId" uuid NOT NULL, "cardId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0f50c79662214ef4d0f14956980" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cards" ("id" SERIAL NOT NULL, "price" integer NOT NULL, "isForSale" boolean NOT NULL DEFAULT false, "innerCardId" character varying(30) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_b92b3ed0d2319d83a79c88e27ac" UNIQUE ("innerCardId"), CONSTRAINT "PK_5f3269634705fdff4a9935860fc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users_stats" ADD CONSTRAINT "FK_3d6cc217af2451426c44a30e678" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_relationships" ADD CONSTRAINT "FK_ed71df92891addd43796acfdf75" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_relationships" ADD CONSTRAINT "FK_a163b75855d06426f1e73c62481" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_c88d2686339ad6d166620b741a6" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_f87decbde298d0407e00f8f46ce" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invite-codes" ADD CONSTRAINT "FK_9c3f10092e553e1813d2aee07da" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deck-cards" ADD CONSTRAINT "FK_4ad2d27f41205be557ab939abca" FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deck-cards" ADD CONSTRAINT "FK_4ad820e3f7fdc189d3328bd0773" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "decks" ADD CONSTRAINT "FK_d60e048034edfd232e0b8cedaeb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_collections" ADD CONSTRAINT "FK_91581bd94d4441e967955d6654f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_collections" ADD CONSTRAINT "FK_dcaff0ddf7e096daf527dcc462b" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_collections" DROP CONSTRAINT "FK_dcaff0ddf7e096daf527dcc462b"`);
        await queryRunner.query(`ALTER TABLE "user_collections" DROP CONSTRAINT "FK_91581bd94d4441e967955d6654f"`);
        await queryRunner.query(`ALTER TABLE "decks" DROP CONSTRAINT "FK_d60e048034edfd232e0b8cedaeb"`);
        await queryRunner.query(`ALTER TABLE "deck-cards" DROP CONSTRAINT "FK_4ad820e3f7fdc189d3328bd0773"`);
        await queryRunner.query(`ALTER TABLE "deck-cards" DROP CONSTRAINT "FK_4ad2d27f41205be557ab939abca"`);
        await queryRunner.query(`ALTER TABLE "invite-codes" DROP CONSTRAINT "FK_9c3f10092e553e1813d2aee07da"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_f87decbde298d0407e00f8f46ce"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_c88d2686339ad6d166620b741a6"`);
        await queryRunner.query(`ALTER TABLE "friend_relationships" DROP CONSTRAINT "FK_a163b75855d06426f1e73c62481"`);
        await queryRunner.query(`ALTER TABLE "friend_relationships" DROP CONSTRAINT "FK_ed71df92891addd43796acfdf75"`);
        await queryRunner.query(`ALTER TABLE "users_stats" DROP CONSTRAINT "FK_3d6cc217af2451426c44a30e678"`);
        await queryRunner.query(`DROP TABLE "cards"`);
        await queryRunner.query(`DROP TABLE "user_collections"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d443082eccd5198f95f2a36e2"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "decks"`);
        await queryRunner.query(`DROP TABLE "deck-cards"`);
        await queryRunner.query(`DROP TABLE "invite-codes"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TABLE "friend_relationships"`);
        await queryRunner.query(`DROP TABLE "users_stats"`);
    }

}
