import { User } from '../src/entities/user'

export const testUser: Pick<
    Required<User>,
    'user_id' | 'email' | 'phone' | 'username'
> = {
    user_id: 'e5aa7358-d55d-45a6-8787-f56265105602',
    email: 'joe.bloggs@gmail.com',
    phone: '+4412345678910',
    username: 'Joe.Bloggs',
}
