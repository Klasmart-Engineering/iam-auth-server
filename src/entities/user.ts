import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// Disable synchronization to avoid auto-migation and data loss
// https://typeorm.io/#/migrations
@Entity({ synchronize: false })
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    public user_id!: string

    @Column({ nullable: true })
    public email?: string

    @Column({ nullable: true })
    public phone?: string
}
