import type { LocalDatabase } from "../utils/storage";
import { emptyDatabase } from "../utils/storage";
import { parsePolicyText } from "../utils/parser";
import {
  pairSections,
  buildDiffRow
} from "../utils/diffEngine";
import {
  createPolicyDocumentFromImport
} from "../constructors/PolicyDocumentConstructor";
import {
  createPolicySectionFromParsed
} from "../constructors/PolicySectionConstructor";
import { createDiffResultFromRow } from "../constructors/DiffResultConstructor";
import { createReviewNoteFromForm } from "../constructors/ReviewNoteConstructor";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";

// 本地 mock：首次打开时用两版示例政策自动跑通“导入 → 分段 → 风险标注 → 对比”全流程，
// 之后所有数据改走 localStorage，不再依赖本文件。

const OLD_VERSION = "v2.1（2025-12-01）";
const NEW_VERSION = "v3.0（2026-09-20）";

const OLD_POLICY = `示例服务个人信息保护政策
更新日期：2025年12月1日
本政策适用于示例服务向您提供的各项产品功能，我们将以高度勤勉的义务对待您的个人信息。请您在使用服务前仔细阅读本政策。

一、政策的更新与告知
我们可能适时修订本政策。当本政策发生重大变更时，我们会通过弹窗或站内信方式通知您。未经您明确同意，我们不会削减您按照本政策所享有的权利。

二、我们如何收集和使用您的个人信息
为完成账号注册与实名认证，我们会收集您的手机号码、身份证号、银行卡号；为保障账号安全，我们会收集设备标识符与登录日志。涉及敏感个人信息（如生物识别信息）的处理，我们会另行取得您的明示同意。

三、我们如何使用Cookie
我们使用Cookie记录您的登录状态与偏好设置，用于提升浏览体验。您可以通过浏览器设置清除Cookie。

四、信息的对外共享
我们仅会在获得您同意的情况下与合作伙伴共享必要信息，并要求其按照同等保密义务处理。除法律要求外，我们不会将您的个人信息提供给任何第三方。

五、位置信息
在您使用附近的人、同城服务功能时，我们会收集您的地理位置信息用于展示周边内容。您可以在系统设置中关闭位置权限。

六、信息的保存期限
我们会在实现处理目的所必需的期限内保留您的个人信息；账号注销后，相关信息将依法保留十年或永久保存，以满足监管要求。

七、法律适用与争议解决
本政策的订立、执行与解释均适用中华人民共和国法律。因本政策引起的争议，双方应友好协商解决；协商不成的，任一方可向我们住所地有管辖权的人民法院提起诉讼。

八、信息安全
我们采取加密传输、访问控制等合理措施保护您的个人信息，防止信息遭到未经授权的访问、披露或篡改。如发生个人信息安全事件，我们将依法及时告知您。

九、个性化广告与推送
我们可能基于您的偏好标签通过站内消息向您推送商业广告，您可以在设置中关闭个性化广告推荐。`;

const NEW_POLICY = `示例服务个人信息保护政策
更新日期：2026年9月20日
本政策适用于示例服务向您提供的各项产品功能。为向您提供更个性化的服务，本版本更新了信息收集、共享与保存相关条款，请您仔细阅读。

一、政策的更新与告知
我们可能适时修订本政策。重大变更时将以弹窗、站内信及电子邮件方式通知您，且继续使用服务即视为您同意修订后的政策。

二、我们如何收集和使用您的个人信息
注册与实名认证环节需要收集手机号码及法定身份证件信息。为提供个性化推荐，我们还会收集设备标识符、浏览记录与健康状态信息。处理敏感个人信息前，我们将取得您的单独同意，相关信息经加密、脱敏后存储。

三、我们如何使用Cookie与同类技术
我们使用Cookie与同类追踪技术记录登录状态、偏好设置及行为画像，用于改进产品与广告投放。您可在浏览器设置中管理或清除Cookie。

四、信息的对外共享、转让与委托处理
为实现广告归因与联合运营，我们会将您的设备标识符、浏览偏好共享给第三方广告平台，并授权第三方SDK进行数据统计。取得您授权同意后我们方可向第三方提供上述信息，法律另有规定的除外。

五、位置信息
为提供同城推荐与商家配送服务，我们会持续收集您的精确位置信息，即使您未主动使用相关功能也可能在后台进行定位。您可以随时关闭定位权限。

六、信息的保存期限
我们仅在实现目的所必需的最短期限内保留您的个人信息；超出必要期限后将及时删除或进行匿名化处理，法律法规另有规定的从其规定。

七、法律适用与争议解决
本政策的订立、执行与解释均适用中华人民共和国法律。因本政策引起的争议，双方应友好协商解决；协商不成的，任一方可向我们住所地有管辖权的人民法院提起诉讼。

八、未成年人个人信息保护
我们非常重视未成年人个人信息保护。处理不满十四周岁未成年人个人信息前，应取得其父母或其他监护人的同意。我们可能收集未成年人的行踪轨迹、精确位置与健康信息，仅用于安全守护功能。

九、适用范围
本政策适用于我们通过自有网站、移动应用及小程序向您提供的各项服务，不适用于第三方平台依托我们服务向您提供的产品或功能。

十、联系我们
如对本政策或个人信息处理有任何疑问、意见或投诉，您可通过隐私事务邮箱 privacy@example.com 与我们联系，我们将在十五个工作日内回复。

十一、信息安全
我们采取加密传输、访问控制等合理措施保护您的个人信息，防止信息遭到未经授权的访问、披露或篡改。如发生个人信息安全事件，我们将依法及时告知您。`;

export const seedPolicyTexts = {
  old: { title: "示例服务个人信息保护政策", version: OLD_VERSION, text: OLD_POLICY },
  new: { title: "示例服务个人信息保护政策", version: NEW_VERSION, text: NEW_POLICY }
};

const SEED_TIME_OLD = "2026-09-01T09:00:00.000Z";
const SEED_TIME_NEW = "2026-09-20T09:00:00.000Z";
const SEED_TIME_DIFF = "2026-09-20T09:05:00.000Z";

function buildDocument(id: number, title: string, version: string, text: string): {
  document: PolicyDocument;
  sections: PolicySection[];
} {
  const parsed = parsePolicyText(text);
  const document = createPolicyDocumentFromImport(
    id,
    { title, version_label: version, raw_text: text },
    parsed.sections
  );
  const baseSectionId = id === 1 ? 0 : 100;
  const sections = parsed.sections.map((section, index) =>
    createPolicySectionFromParsed(baseSectionId + index + 1, id, section)
  );
  return { document, sections };
}

export function buildSeedDatabase(): LocalDatabase {
  const db = emptyDatabase();
  const oldPack = buildDocument(1, seedPolicyTexts.old.title, seedPolicyTexts.old.version, seedPolicyTexts.old.text);
  const newPack = buildDocument(2, seedPolicyTexts.new.title, seedPolicyTexts.new.version, seedPolicyTexts.new.text);

  // 固定导入时间，保证种子稳定
  oldPack.document.imported_at = SEED_TIME_OLD;
  newPack.document.imported_at = SEED_TIME_NEW;

  const documents: PolicyDocument[] = [oldPack.document, newPack.document];
  const sections: PolicySection[] = [...oldPack.sections, ...newPack.sections];

  const pairs = pairSections(oldPack.sections, newPack.sections);
  const diffs = pairs.map((pair, index) =>
    createDiffResultFromRow(
      index + 1,
      buildDiffRow(pair, oldPack.document, newPack.document, {
        created_at: SEED_TIME_DIFF,
        updated_at: SEED_TIME_DIFF
      })
    )
  );

  const findDiff = (no: string) => diffs.find((diff) => diff.section_no === no);
  const notes = [
    createReviewNoteFromForm(1, {
      diff_result_id: findDiff("四")?.id ?? 1,
      tag: "升级处理",
      comment: "新版新增第三方广告平台共享与 SDK 授权，风险升至严重，需法务确认合作方清单与 DPA。",
      reviewer: "合规同事"
    }),
    createReviewNoteFromForm(2, {
      diff_result_id: findDiff("五")?.id ?? 1,
      tag: "需业务说明",
      comment: "后台持续精确定位的必要性与最小化原则存疑，请业务补充说明触发场景。",
      reviewer: "合规同事"
    }),
    createReviewNoteFromForm(3, {
      diff_result_id: findDiff("六")?.id ?? 1,
      tag: "可接受",
      comment: "新版删除“十年/永久保存”表述，改为最短期限+删除/匿名化，建议确认台账已同步。",
      reviewer: "合规同事"
    })
  ];
  notes[0].status = "CONFIRMED";
  notes[0].updated_at = SEED_TIME_DIFF;
  notes[2].status = "RESOLVED";
  notes[2].updated_at = SEED_TIME_DIFF;

  return {
    ...db,
    policyDocument: documents,
    policySection: sections,
    diffResult: diffs,
    reviewNote: notes
  };
}
