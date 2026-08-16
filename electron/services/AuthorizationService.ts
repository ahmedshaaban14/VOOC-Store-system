import { AuthService } from './AuthService';
import { User, Product } from '../../src/shared/types';

export class AuthorizationService {
  // Ensure an authenticated session exists
  static async requireAuth(): Promise<User> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('غير مسموح! يجب تسجيل الدخول أولاً للوصول للنظام.');
    }
    return user;
  }

  // Ensure an authenticated ADMIN session exists
  static async requireAdmin(): Promise<User> {
    const user = await this.requireAuth();
    if (user.role !== 'ADMIN') {
      throw new Error('غير مسموح! هذه العملية تقتصر فقط على مدير النظام (Admin).');
    }
    return user;
  }

  // Seller Data Privacy Sanitization for Products (OMITS purchasePrice completely)
  static sanitizeProductForRole(product: Product | null, role: string): any {
    if (!product) return null;
    if (role === 'SELLER') {
      const {
        purchasePrice,
        costPrice,
        profit,
        profitMargin,
        margin,
        inventoryValue,
        totalInventoryValue,
        ...sellerSafeProduct
      } = product as any;
      return sellerSafeProduct;
    }
    return product;
  }

  // Bulk Product Privacy Sanitization (OMITS purchasePrice completely for every product)
  static sanitizeProductsForRole(productsList: Product[], role: string): any[] {
    if (role === 'SELLER') {
      return productsList.map((product) => {
        const {
          purchasePrice,
          costPrice,
          profit,
          profitMargin,
          margin,
          inventoryValue,
          totalInventoryValue,
          ...sellerSafeProduct
        } = product as any;
        return sellerSafeProduct;
      });
    }
    return productsList;
  }
}
