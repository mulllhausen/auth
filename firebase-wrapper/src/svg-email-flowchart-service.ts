import type { TEmailSVGCSSClass } from "./svg-email-flowchart-auto-types";
import {
    EmailSVGArrowCSSClass,
    EmailSVGStateBoxCSSClass,
} from "./svg-email-flowchart-auto-types";
import type {
    TSVGCSSClassCategoryValues,
    TSVGStateStatusValues,
} from "./svg-flowchart-service";
import {
    SVGCSSClassCategory,
    SVGFlowChartService,
    SVGStateStatus,
} from "./svg-flowchart-service";

const EmailSVGHierarchy: {
    [K in TSVGCSSClassCategoryValues]: TEmailSVGCSSClass;
} = {
    [SVGCSSClassCategory.Arrow]: EmailSVGArrowCSSClass,
    [SVGCSSClassCategory.StateBox]: EmailSVGStateBoxCSSClass,
} as const;

export class SVGEmailFlowService extends SVGFlowChartService {
    /** for testing */
    public SetAllIndividually(
        status: TSVGStateStatusValues = SVGStateStatus.Success,
    ): void {
        this.SetCategoryIndividually(EmailSVGStateBoxCSSClass, status);
        this.SetCategoryIndividually(EmailSVGArrowCSSClass, status);
    }

    private SetCategoryIndividually(
        emailSVGCSSClassObj: TEmailSVGCSSClass,
        status: TSVGStateStatusValues,
    ) {
        for (const objKey in emailSVGCSSClassObj) {
            const objValue =
                emailSVGCSSClassObj[objKey as keyof typeof emailSVGCSSClassObj];
            this.AddCSSClassBySelector(objValue, status);
        }
    }

    // public SetAll(
    //     svgCSSClassObjOrCategory:
    //         | TEmailSVGCSSClass
    //         | TSVGCSSClassCategoryValues,
    //     status: TSVGStateStatusValues,
    // ): void {
    //     if (this.isSVGCSSClassCategory(svgCSSClassObjOrCategory)){
    //         this.svgFlowService.SetCategory(svgCSSClassObjOrCategory, status);
    //     }
    //     if (this.isEmailSVGCSSClass(svgCSSClassObjOrCategory)) {
    //         this.svgService.SetStatusBySelector(
    //             `.${svgCSSClassObjOrCategory}`,
    //             status,
    //         );
    //         return;
    //     }
    //     if (EmailSVGHierarchy.find((k,v) => v === svgCSSClassObjOrCategory)) {

    //     }
    //     else {
    //         throw;
    //     }

    //     if (svgCSSClassObjOrCategory instanceof TEmailSVGCSSClassObj)
    //         for (const objKey in svgCSSClassObjOrCategory) {
    //             const objValue =
    //                 svgCSSClassObjOrCategory[
    //                     objKey as keyof typeof svgCSSClassObjOrCategory
    //                 ];
    //             this.SetElementStatus(objValue, status);
    //         }
    // }

    // public UnsetAllByType(svgCSSClassType: TEmailSVGCSSClass): void {
    //     for (const objKey in svgCSSClassType) {
    //         const objValue =
    //             svgCSSClassType[objKey as keyof typeof svgCSSClassType];

    //         this.UnsetElementStatus(objValue, SVGStateStatus.Success);
    //         this.UnsetElementStatus(objValue, SVGStateStatus.Failure);
    //     }
    // }

    // public SetElementStatus(
    //     cssClass: TEmailSVGCSSClassValues | TEmailSVGCSSClass,
    //     status: TSVGStateStatusValues,
    // ): void {
    //     const cssCategory = this.getCategory(cssClass);
    //     const querySelector = `.${cssCategory}.${cssClass}`;
    //     this.svgService.SetStatusBySelector(querySelector, status);
    // }

    // public UnsetElementStatus(
    //     cssClass: TEmailSVGCSSClassValues,
    //     status: TSVGStateStatusValues,
    // ): void {
    //     this.svgService.UnsetStatusBySelector(
    //         `.${this.getCategory(cssClass)}`,
    //         status,
    //     );
    // }

    // private getCategory(
    //     cssClass: TEmailSVGCSSClass | TEmailSVGCSSClassValues,
    // ): TSVGCSSClassCategoryValues {
    //     if (cssClass instanceof EmailSVGCSSClassObject) {
    //         return cssClass;
    //     }
    //     type tupleArray = [
    //         TSVGCSSClassCategoryValues,
    //         TSVGCategoryInfo<TEmailSVGCSSClass>,
    //     ][];
    //     const entries = Object.entries(EmailSVGHierarchy) as tupleArray;
    //     const found = entries.find(([, categoryInfo]) =>
    //         Object.values(categoryInfo.valueType).includes(cssClass),
    //     )?.[0];
    //     if (!found) throw new Error(`Unknown CSS class "${cssClass}"`);
    //     return found;
    // }

    // private isEmailSVGCSSClass(
    //     cssClassOrObj: | TEmailSVGCSSClass
    //         | TSVGCSSClassCategoryValues,
    // ): cssClassOrObj is TEmailSVGCSSClass {
    //     return Object.values(EmailSVGHierarchy).includes(cssClassOrObj as TEmailSVGCSSClass);
    // }

    // private isSVGCSSClassCategory(
    //     cssClassOrObj: | TEmailSVGCSSClass
    //         | TSVGCSSClassCategoryValues,
    // ): cssClassOrObj is TSVGCSSClassCategoryValues {
    //     return Object.keys(EmailSVGHierarchy).includes(cssClassOrObj as TSVGCSSClassCategoryValues);
    // }
}
