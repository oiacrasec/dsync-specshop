import { Routes } from '@angular/router';
import { UserList } from './user-list';
import { UserCreate } from './user-create';
import { CreateLayout } from './create/create-layout';
import { BasicInformation } from './create/basic-information';
import { BusinessInformation } from './create/business-information';
import { LocationInformation } from './create/location-information';
import { Authorization } from './create/authorization';
import { AccountStatus } from './create/account-status';

export default [
    { path: 'list', component: UserList, data: { breadcrumb: 'List' } },
    { path: 'create-simple', component: UserCreate },
    {
        path: 'create',
        component: CreateLayout,
        children: [
            { path: '', redirectTo: 'basic-information', pathMatch: 'full' },
            { path: 'basic-information', component: BasicInformation, data: { breadcrumb: 'Basic Information' } },
            { path: 'business-information', component: BusinessInformation, data: { breadcrumb: 'Business Information' } },
            { path: 'location-information', component: LocationInformation, data: { breadcrumb: 'Location Information' } },
            { path: 'authorization', component: Authorization, data: { breadcrumb: 'Authorization Information' } },
            { path: 'account-status', component: AccountStatus, data: { breadcrumb: 'Account Status' } }
        ]
    },
    { path: '', redirectTo: 'list', pathMatch: 'full' }
] as Routes;
