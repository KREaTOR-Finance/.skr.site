use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer as SystemTransfer};
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

declare_id!("8krPuBvS8nKkQ5fhqeHAAhY47Y9b6iG6XU4Ut5xtf1fH");

const SKR_UNLOCK_AMOUNT: u64 = 1_000_000_000;
const TEMPLATE_CHANGE_FEE_LAMPORTS: u64 = 10_000_000;
const SKR_DECIMALS: u8 = 6;
const SKR_MINT: Pubkey = pubkey!("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
const SKR_TREASURY: Pubkey = pubkey!("7NQnWRziGPj3XWRwyEZzqqfYhvPZjCHBtJ3g96QQXbDH");
const MAX_DOMAIN_LEN: usize = 64;
const MAX_TEMPLATE_LEN: usize = 32;
const MAX_URI_LEN: usize = 256;

#[program]
pub mod skr_publish_program {
    use super::*;

    pub fn purchase_template(ctx: Context<PurchaseTemplate>, args: PurchaseTemplateArgs) -> Result<()> {
        require!(args.template_id.len() <= MAX_TEMPLATE_LEN, SkrError::TemplateTooLong);
        require!(is_premium_template(&args.template_id), SkrError::TemplateMustBePremium);

        let entitlement = &mut ctx.accounts.entitlement;
        let mut charged_purchase_skr = false;

        if !entitlement.purchased {
            require!(ctx.accounts.mint.key() == SKR_MINT, SkrError::InvalidMint);
            require!(ctx.accounts.treasury_owner.key() == SKR_TREASURY, SkrError::InvalidTreasury);

            // Critical invariant: payer must sign and authorize transfer of exactly 1000 SKR.
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.payer_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
            token_interface::transfer_checked(cpi_ctx, SKR_UNLOCK_AMOUNT, SKR_DECIMALS)?;
            charged_purchase_skr = true;
        }

        entitlement.wallet = ctx.accounts.payer.key();
        entitlement.template_id = args.template_id.clone();
        entitlement.purchased = true;
        entitlement.purchased_at = Clock::get()?.unix_timestamp;
        entitlement.bump = ctx.bumps.entitlement;
        entitlement.initialized = true;

        emit!(TemplatePurchased {
            wallet: entitlement.wallet,
            template_id: entitlement.template_id.clone(),
            charged_purchase_skr,
            slot: Clock::get()?.slot,
        });

        Ok(())
    }

    pub fn record_publish(
        ctx: Context<UnlockAndRecordPublish>,
        args: RecordPublishArgs,
    ) -> Result<()> {
        require!(args.domain.len() <= MAX_DOMAIN_LEN, SkrError::DomainTooLong);
        require!(args.template_id.len() <= MAX_TEMPLATE_LEN, SkrError::TemplateTooLong);
        require!(args.content_uri.len() <= MAX_URI_LEN, SkrError::UriTooLong);

        let template_is_premium = is_premium_template(&args.template_id);
        if template_is_premium {
            let (expected_entitlement, _) = Pubkey::find_program_address(
                &[b"entitlement", ctx.accounts.payer.key().as_ref(), args.template_id.as_bytes()],
                &ctx.program_id,
            );
            let entitlement = ctx
                .accounts
                .entitlement
                .as_ref()
                .ok_or_else(|| error!(SkrError::MissingTemplateEntitlement))?;
            require!(
                entitlement.key() == expected_entitlement,
                SkrError::MissingTemplateEntitlement
            );
            require!(entitlement.purchased, SkrError::TemplateNotPurchased);
        }

        let publisher = &mut ctx.accounts.publisher;
        if !publisher.initialized {
            publisher.wallet = ctx.accounts.payer.key();
            publisher.last_template_id = String::new();
            publisher.has_published = false;
            publisher.bump = ctx.bumps.publisher;
            publisher.initialized = true;
        }

        let mut charged_rotation_fee_lamports = 0u64;
        if should_charge_rotation_fee(
            publisher.has_published,
            &publisher.last_template_id,
            &args.template_id,
        ) {
            let cpi_accounts = SystemTransfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.treasury_owner.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts);
            system_program::transfer(cpi_ctx, TEMPLATE_CHANGE_FEE_LAMPORTS)?;
            charged_rotation_fee_lamports = TEMPLATE_CHANGE_FEE_LAMPORTS;
        }

        publisher.last_template_id = args.template_id.clone();
        publisher.has_published = true;

        let receipt = &mut ctx.accounts.receipt;
        receipt.wallet = ctx.accounts.payer.key();
        receipt.domain = args.domain;
        receipt.template_id = args.template_id;
        receipt.content_hash = args.content_hash;
        receipt.content_uri = args.content_uri;
        receipt.required_entitlement = template_is_premium;
        receipt.charged_rotation_fee_lamports = charged_rotation_fee_lamports;
        receipt.slot = Clock::get()?.slot;
        receipt.created_at = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.receipt;

        emit!(PublishRecorded {
            wallet: receipt.wallet,
            domain: receipt.domain.clone(),
            template_id: receipt.template_id.clone(),
            content_hash: receipt.content_hash,
            content_uri: receipt.content_uri.clone(),
            required_entitlement: receipt.required_entitlement,
            charged_rotation_fee_lamports: receipt.charged_rotation_fee_lamports,
            slot: receipt.slot,
        });

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecordPublishArgs {
    pub domain: String,
    pub template_id: String,
    pub content_hash: [u8; 32],
    pub content_uri: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PurchaseTemplateArgs {
    pub template_id: String,
}

#[derive(Accounts)]
#[instruction(args: PurchaseTemplateArgs)]
pub struct PurchaseTemplate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + TemplateEntitlement::LEN,
        seeds = [b"entitlement", payer.key().as_ref(), args.template_id.as_bytes()],
        bump
    )]
    pub entitlement: Account<'info, TemplateEntitlement>,

    #[account(address = SKR_MINT)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = payer,
        token::token_program = token_program
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = treasury_owner,
        token::token_program = token_program
    )]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Hard-address constrained to treasury pubkey.
    #[account(mut, address = SKR_TREASURY)]
    pub treasury_owner: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: RecordPublishArgs)]
pub struct UnlockAndRecordPublish<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + PublisherState::LEN,
        seeds = [b"publisher", payer.key().as_ref()],
        bump
    )]
    pub publisher: Account<'info, PublisherState>,

    #[account(
        init,
        payer = payer,
        space = 8 + PublishReceipt::LEN,
        seeds = [b"receipt", payer.key().as_ref(), &args.content_hash],
        bump
    )]
    pub receipt: Account<'info, PublishReceipt>,

    pub entitlement: Option<Account<'info, TemplateEntitlement>>,

    /// CHECK: Hard-address constrained to treasury pubkey.
    #[account(mut, address = SKR_TREASURY)]
    pub treasury_owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct TemplateEntitlement {
    pub wallet: Pubkey,
    pub template_id: String,
    pub purchased: bool,
    pub purchased_at: i64,
    pub bump: u8,
    pub initialized: bool,
}

impl TemplateEntitlement {
    pub const LEN: usize = 32 + (4 + MAX_TEMPLATE_LEN) + 1 + 8 + 1 + 1;
}

#[account]
pub struct PublisherState {
    pub wallet: Pubkey,
    pub last_template_id: String,
    pub has_published: bool,
    pub bump: u8,
    pub initialized: bool,
}

impl PublisherState {
    pub const LEN: usize = 32 + (4 + MAX_TEMPLATE_LEN) + 1 + 1 + 1;
}

#[account]
pub struct PublishReceipt {
    pub wallet: Pubkey,
    pub domain: String,
    pub template_id: String,
    pub content_hash: [u8; 32],
    pub content_uri: String,
    pub required_entitlement: bool,
    pub charged_rotation_fee_lamports: u64,
    pub slot: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl PublishReceipt {
    pub const LEN: usize =
        32 + (4 + MAX_DOMAIN_LEN) + (4 + MAX_TEMPLATE_LEN) + 32 + (4 + MAX_URI_LEN) + 1 + 8 + 8 + 8 + 1;
}

#[event]
pub struct TemplatePurchased {
    pub wallet: Pubkey,
    pub template_id: String,
    pub charged_purchase_skr: bool,
    pub slot: u64,
}

#[event]
pub struct PublishRecorded {
    pub wallet: Pubkey,
    pub domain: String,
    pub template_id: String,
    pub content_hash: [u8; 32],
    pub content_uri: String,
    pub required_entitlement: bool,
    pub charged_rotation_fee_lamports: u64,
    pub slot: u64,
}

fn is_premium_template(template_id: &str) -> bool {
    matches!(
        template_id,
        "social-hub"
            | "shop"
            | "calendar"
            | "health"
            | "portfolio"
            | "organization"
            | "link-in-bio"
            | "bring-your-own"
    )
}

fn should_charge_rotation_fee(has_published: bool, previous_template: &str, new_template: &str) -> bool {
    has_published && !previous_template.is_empty() && previous_template != new_template
}

#[error_code]
pub enum SkrError {
    #[msg("Invalid SKR mint account")]
    InvalidMint,
    #[msg("Invalid treasury owner account")]
    InvalidTreasury,
    #[msg("Domain is too long")]
    DomainTooLong,
    #[msg("Template id is too long")]
    TemplateTooLong,
    #[msg("Content URI is too long")]
    UriTooLong,
    #[msg("Unlock-only requires a premium template")]
    TemplateMustBePremium,
    #[msg("Template entitlement account is missing or invalid")]
    MissingTemplateEntitlement,
    #[msg("Template has not been purchased for this wallet")]
    TemplateNotPurchased,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn premium_template_map_is_correct() {
        assert!(!is_premium_template("personal-bio"));
        assert!(is_premium_template("social-hub"));
        assert!(is_premium_template("bring-your-own"));
    }

    #[test]
    fn rotation_fee_is_only_for_template_changes() {
        assert!(!should_charge_rotation_fee(false, "", "social-hub"));
        assert!(!should_charge_rotation_fee(true, "social-hub", "social-hub"));
        assert!(should_charge_rotation_fee(true, "social-hub", "shop"));
    }

    #[test]
    fn free_templates_are_not_premium() {
        assert!(!is_premium_template("personal-bio"));
        assert!(!is_premium_template("unknown"));
    }
}
