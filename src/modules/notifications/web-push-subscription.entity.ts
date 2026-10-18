import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('web_push_subscriptions')
export class WebPushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ name: 'p256dh', type: 'text' })
  p256dh: string;

  @Column({ name: 'auth', type: 'text' })
  auth: string;

  @CreateDateColumn()
  createdAt: Date;
}
