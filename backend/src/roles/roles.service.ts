import { Injectable, NotFoundException } from '@nestjs/common';
import { Authorization, Role } from '../common/types';
import { StoreService } from '../store/store.service';

export interface RoleDetail extends Role {
  authorizations: Authorization[];
  memberCount: number;
  members: Array<{ id: string; name: string }>;
}

@Injectable()
export class RolesService {
  constructor(private readonly store: StoreService) {}

  list(filter: { q?: string; area?: string }): Array<Role & { memberCount: number }> {
    let roles = this.store.getRoles();
    if (filter.area) roles = roles.filter((r) => r.area === filter.area);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      roles = roles.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }
    return roles.map((r) => ({
      ...r,
      memberCount: this.store.getRoleMembers(r.id).length,
    }));
  }

  getOne(id: string): RoleDetail {
    const role = this.store.getRole(id);
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    const memberIds = this.store.getRoleMembers(id);
    const members = memberIds
      .map((uid) => this.store.getUser(uid))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({ id: u.id, name: u.name }));
    return {
      ...role,
      authorizations: this.store.getRoleAuthorizations(id),
      memberCount: members.length,
      members,
    };
  }
}
