import { DataSource } from 'typeorm';

import * as dotenv from 'dotenv';
import { InviteCode } from 'src/invite-code/entities/invite-code.entity';
import { INVITE_CODE_STATUS } from 'src/invite-code/types/invite-code';

dotenv.config();

async function createInviteCode() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        entities: [InviteCode],
    });

    await dataSource.initialize();
    
    const inviteCodeRepo = dataSource.getRepository(InviteCode);
    
    const inviteCode = new InviteCode();
    inviteCode.status = INVITE_CODE_STATUS.FREE;
    
    const saved = await inviteCodeRepo.save(inviteCode);
    
    console.log('\n✅ Invite Code:', saved.id);
    
    await dataSource.destroy();
}

createInviteCode();